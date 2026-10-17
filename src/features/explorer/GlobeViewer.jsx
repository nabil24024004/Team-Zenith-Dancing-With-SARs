import React, { useEffect, useRef, useState } from 'react';
import * as Cesium from 'cesium';
import 'cesium/Build/Cesium/Widgets/widgets.css';
import { Mountain, Globe2, Layers, Focus, Sparkles } from 'lucide-react';
import { DiamondCrosshair } from '../../components/ZenithElements.jsx';
import { SME2_L3_DATASET } from './sme2Data.js';

const CESIUM_ION_TOKEN = (import.meta.env.VITE_CESIUM_ION_TOKEN ?? '').trim();

function hasWebGL() {
  try {
    const canvas = document.createElement('canvas');
    const context =
      canvas.getContext('webgl2') ||
      canvas.getContext('webgl') ||
      canvas.getContext('experimental-webgl');
    return Boolean(context && window.WebGLRenderingContext);
  } catch {
    return false;
  }
}

function polygonHierarchies(feature) {
  const geometry = feature?.geometry;
  const polygons =
    geometry?.type === 'Polygon'
      ? [geometry.coordinates]
      : geometry?.type === 'MultiPolygon'
        ? geometry.coordinates
        : [];
  if (!polygons.length) return null;

  const toRing = (ring) => {
    if (!Array.isArray(ring) || ring.length < 4) return null;
    const positions = ring.map((point) => {
      if (!Array.isArray(point) || point.length < 2) return null;
      const [longitude, latitude] = point;
      if (!Number.isFinite(longitude) || !Number.isFinite(latitude)) return null;
      return Cesium.Cartesian3.fromDegrees(longitude, latitude);
    });
    return positions.every(Boolean) ? positions : null;
  };

  const hierarchies = [];
  for (const polygon of polygons) {
    if (!Array.isArray(polygon) || !polygon.length) return null;
    const outer = toRing(polygon[0]);
    if (!outer) return null;
    const holes = polygon.slice(1).map(toRing);
    if (holes.some((ring) => !ring)) return null;
    hierarchies.push(new Cesium.PolygonHierarchy(outer, holes));
  }
  return hierarchies;
}

function featureBounds(feature) {
  const geometry = feature?.geometry;
  const ring =
    geometry?.type === 'Polygon'
      ? geometry.coordinates?.[0]
      : geometry?.type === 'MultiPolygon'
        ? geometry.coordinates?.[0]?.[0]
        : null;
  if (!Array.isArray(ring) || ring.length < 3) return null;
  let west = Infinity;
  let south = Infinity;
  let east = -Infinity;
  let north = -Infinity;
  for (const pt of ring) {
    if (!Array.isArray(pt) || pt.length < 2) continue;
    const [lon, lat] = pt;
    if (!Number.isFinite(lon) || !Number.isFinite(lat)) continue;
    if (lon < west) west = lon;
    if (lon > east) east = lon;
    if (lat < south) south = lat;
    if (lat > north) north = lat;
  }
  if (!Number.isFinite(west) || west >= east || south >= north) return null;
  return { west, south, east, north };
}

function featureCenter(feature) {
  const geometry = feature?.geometry;
  const ring =
    geometry?.type === 'Polygon'
      ? geometry.coordinates?.[0]
      : geometry?.type === 'MultiPolygon'
        ? geometry.coordinates?.[0]?.[0]
        : null;
  if (!Array.isArray(ring) || ring.length < 2) return null;
  const pts = ring.slice(0, -1);
  if (!pts.length) return null;
  const [lonSum, latSum] = pts.reduce(
    (acc, [lon, lat]) => [acc[0] + lon, acc[1] + lat],
    [0, 0]
  );
  return {
    longitude: lonSum / pts.length,
    latitude: latSum / pts.length,
  };
}

/**
 * Compute a rounded spatial signature for a footprint so identical repeat-pass
 * granules don't stack 70+ semi-transparent polygons into an opaque "X" blob.
 */
function footprintSignature(feature) {
  const geometry = feature?.geometry;
  const ring =
    geometry?.type === 'Polygon'
      ? geometry.coordinates?.[0]
      : geometry?.type === 'MultiPolygon'
        ? geometry.coordinates?.[0]?.[0]
        : null;
  if (!Array.isArray(ring) || !ring.length) return String(feature?.id ?? '');
  const p = feature?.properties ?? {};
  const level = p.processingLevel ?? p.productType ?? '';
  const isStrip = level === 'RRSD';
  const coordsKey = ring
    .slice(0, -1)
    .map(([lon, lat]) => `${lon.toFixed(1)},${lat.toFixed(1)}`)
    .join(';');
  return `${isStrip ? 'STRIP' : 'FRAME'}:${p.flightDirection ?? ''}:${coordsKey}`;
}

/**
 * Map volumetric soil moisture (0.02 - 0.41 m³/m³) strictly to the Team Zenith
 * palette: Rose (#FDA4AF) -> Crimson (#E11D48) -> Violet (#8B5CF6) -> Lavender (#DDD6FE)
 */
function soilMoistureColor(smValue) {
  const norm = Math.max(0, Math.min(1, (smValue - 0.04) / 0.24));
  if (norm < 0.35) {
    return Cesium.Color.fromCssColorString('#FDA4AF').withAlpha(0.88);
  }
  if (norm < 0.65) {
    return Cesium.Color.fromCssColorString('#E11D48').withAlpha(0.92);
  }
  if (norm < 0.85) {
    return Cesium.Color.fromCssColorString('#A78BFA').withAlpha(0.95);
  }
  return Cesium.Color.fromCssColorString('#DDD6FE').withAlpha(0.98);
}

export default function GlobeViewer({
  features = [],
  selectedId,
  onSelect,
  drapeRadarOnGlobe = true,
  sme2FocusTrigger = 0,
  comparePair = null,
  changeProduct = null,
  compareLayerMode = 'floodMask',
  compareOpacity = 0.9,
  onOpacityChange,
  splitRatio = 0.5,
  onSplitRatioChange,
  onExitCompare,
  onSetCompareMode,
  onSwapCompare,
  onStartAutoCompare,
  activePartner = null,
}) {
  const hostRef = useRef(null);
  const viewerRef = useRef(null);
  const footprintEntitiesRef = useRef(new Map());
  const referenceEntitiesRef = useRef([]);
  const onSelectRef = useRef(onSelect);
  const lastFlownIdRef = useRef(selectedId);
  const curtainLayersRef = useRef({ layerA: null, layerB: null });
  const compareEntitiesRef = useRef([]);
  const lastFlownCompareKeyRef = useRef(null);
  const [status, setStatus] = useState({
    state: 'loading',
    message: 'Initializing Cesium Ion 3D terrain & satellite globe…',
  });
  const [viewerReady, setViewerReady] = useState(false);
  const [terrainActive, setTerrainActive] = useState(false);
  const [showRawStrips, setShowRawStrips] = useState(false);

  useEffect(() => {
    onSelectRef.current = onSelect;
  }, [onSelect]);

  // Tilted 3D oblique camera view showcasing Himalayan 3D mountain elevation + SAR swaths
  const flyTo3DTerrain = () => {
    const viewer = viewerRef.current;
    if (!viewer || viewer.isDestroyed()) return;
    viewer.camera.flyTo({
      destination: Cesium.Cartesian3.fromDegrees(89.65, 22.15, 360_000),
      orientation: {
        heading: Cesium.Math.toRadians(0.0),
        pitch: Cesium.Math.toRadians(-27.0),
        roll: 0.0,
      },
      duration: 1.35,
    });
  };

  // Fly directly to the 561 real 200m EASE-Grid 2.0 L3 Soil Moisture points over Svalbard
  const flyToSvalbardSme2 = () => {
    const viewer = viewerRef.current;
    if (!viewer || viewer.isDestroyed()) return;
    onSelectRef.current?.(SME2_L3_DATASET.granuleId);
    viewer.camera.flyTo({
      destination: Cesium.Cartesian3.fromDegrees(13.94, 77.36, 26_000),
      orientation: {
        heading: Cesium.Math.toRadians(0.0),
        pitch: Cesium.Math.toRadians(-40.0),
        roll: 0.0,
      },
      duration: 1.35,
    });
  };

  useEffect(() => {
    if (sme2FocusTrigger > 0 && viewerReady) {
      flyToSvalbardSme2();
    }
  }, [sme2FocusTrigger, viewerReady]);

  const flyToRegion = () => {
    const viewer = viewerRef.current;
    if (!viewer || viewer.isDestroyed()) return;
    viewer.camera.flyTo({
      destination: Cesium.Cartesian3.fromDegrees(89.8, 25.8, 2_400_000),
      orientation: {
        heading: 0.0,
        pitch: Cesium.Math.toRadians(-78.0),
        roll: 0.0,
      },
      duration: 1.1,
    });
  };

  const flyToGlobal = () => {
    const viewer = viewerRef.current;
    if (!viewer || viewer.isDestroyed()) return;
    viewer.camera.flyTo({
      destination: Cesium.Cartesian3.fromDegrees(86.0, 22.0, 13_500_000),
      orientation: {
        heading: 0.0,
        pitch: Cesium.Math.toRadians(-90.0),
        roll: 0.0,
      },
      duration: 1.1,
    });
  };

  useEffect(() => {
    if (!hostRef.current) return undefined;
    if (!hasWebGL()) {
      setStatus({
        state: 'unsupported',
        message:
          'WebGL is unavailable. Enable hardware acceleration or open this view in a WebGL-capable browser.',
      });
      return undefined;
    }

    let viewer;
    let isCancelled = false;

    try {
      Cesium.Ion.defaultAccessToken = CESIUM_ION_TOKEN;

      viewer = new Cesium.Viewer(hostRef.current, {
        animation: false,
        baseLayerPicker: false,
        baseLayer: false,
        geocoder: false,
        homeButton: false,
        infoBox: false,
        navigationHelpButton: false,
        sceneModePicker: false,
        selectionIndicator: false,
        timeline: false,
        fullscreenButton: false,
        vrButton: false,
        projectionPicker: false,
        requestRenderMode: true,
        maximumRenderTimeChange: Infinity,
        terrainProvider: new Cesium.EllipsoidTerrainProvider(),
      });
      viewerRef.current = viewer;

      viewer.scene.backgroundColor = Cesium.Color.fromCssColorString('#040406');
      viewer.scene.globe.baseColor = Cesium.Color.fromCssColorString('#090910');
      viewer.scene.globe.enableLighting = false;
      viewer.scene.globe.show = true;
      viewer.scene.globe.showGroundAtmosphere = true;
      viewer.scene.verticalExaggeration = 2.0;
      viewer.scene.skyAtmosphere.show = true;
      viewer.scene.skyAtmosphere.hueShift = 0.08;
      viewer.scene.skyAtmosphere.saturationShift = -0.25;
      viewer.scene.skyAtmosphere.brightnessShift = -0.15;
      viewer.scene.sun.show = false;
      viewer.scene.moon.show = false;

      viewer.scene.screenSpaceCameraController.minimumZoomDistance = 8_000;
      viewer.scene.screenSpaceCameraController.maximumZoomDistance = 35_000_000;

      // Start at an orbital view where Earth's curvature, the Himalayas, and South Asia are framed
      viewer.camera.setView({
        destination: Cesium.Cartesian3.fromDegrees(89.5, 24.5, 6_800_000),
      });

      viewer.scene.globe.tileLoadProgressEvent.addEventListener(() => {
        if (!viewer.isDestroyed()) viewer.scene.requestRender();
      });

      // 1. Offline-guaranteed bundled NaturalEarthII physical imagery base layer
      Cesium.TileMapServiceImageryProvider.fromUrl(
        Cesium.buildModuleUrl('Assets/Textures/NaturalEarthII')
      )
        .then((naturalEarthProvider) => {
          if (isCancelled || !viewer || viewer.isDestroyed()) return;
          const baseLayer =
            viewer.imageryLayers.addImageryProvider(naturalEarthProvider, 0);
          baseLayer.brightness = 0.82;
          baseLayer.contrast = 1.15;
          baseLayer.saturation = 0.75;
          viewer.scene.requestRender();
        })
        .catch(() => {});

      // 2. Load Cesium Ion World Satellite Imagery (or fallback to Esri World Imagery)
      if (CESIUM_ION_TOKEN) {
        Cesium.createWorldImageryAsync({
          style: Cesium.IonWorldImageryStyle.AERIAL,
        })
          .then((ionImagery) => {
            if (isCancelled || !viewer || viewer.isDestroyed()) return;
            const satLayer = viewer.imageryLayers.addImageryProvider(
              ionImagery,
              1
            );
            satLayer.brightness = 0.86;
            satLayer.contrast = 1.18;
            satLayer.saturation = 0.82;
            viewer.scene.requestRender();
          })
          .catch(() => {
            if (isCancelled || !viewer || viewer.isDestroyed()) return;
            const worldSatellite = new Cesium.UrlTemplateImageryProvider({
              url: 'https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
              maximumLevel: 15,
              credit: 'Esri, Maxar, Earthstar Geographics',
            });
            const satLayer = viewer.imageryLayers.addImageryProvider(
              worldSatellite,
              1
            );
            satLayer.brightness = 0.84;
            satLayer.contrast = 1.18;
            satLayer.saturation = 0.78;
            viewer.scene.requestRender();
          });

        // 3. Load Cesium Ion 3D World Terrain elevation meshes (with vertex normals & water mask)
        Cesium.createWorldTerrainAsync({
          requestVertexNormals: true,
          requestWaterMask: true,
        })
          .then((worldTerrain) => {
            if (isCancelled || !viewer || viewer.isDestroyed()) return;
            viewer.terrainProvider = worldTerrain;
            setTerrainActive(true);
            setStatus({
              state: 'ready',
              message:
                'Cesium Ion 3D World Terrain & NASA Earthdata Cloud active · Click any SAR frame to inspect or drape radar imagery.',
            });
            viewer.scene.requestRender();
          })
          .catch(() => {
            // Keep EllipsoidTerrainProvider fallback if network/token fails
          });
      } else {
        try {
          const worldSatellite = new Cesium.UrlTemplateImageryProvider({
            url: 'https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
            maximumLevel: 15,
            credit: 'Esri, Maxar, Earthstar Geographics',
          });
          const satLayer =
            viewer.imageryLayers.addImageryProvider(worldSatellite);
          satLayer.brightness = 0.84;
          satLayer.contrast = 1.18;
          satLayer.saturation = 0.78;
        } catch {
          // Fallback to bundled NaturalEarthII
        }
      }

      // 4. Watermark-free World Boundaries & Place Labels Reference Overlay
      try {
        const referenceLabels = new Cesium.UrlTemplateImageryProvider({
          url: 'https://services.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}',
          maximumLevel: 14,
          credit: 'Esri, HERE, Garmin, OpenStreetMap',
        });
        const labelLayer =
          viewer.imageryLayers.addImageryProvider(referenceLabels);
        labelLayer.alpha = 0.85;
      } catch {
        // Optional label overlay
      }

      // Add reference marker for the primary South Asia target basin
      const targetMarker = viewer.entities.add({
        position: Cesium.Cartesian3.fromDegrees(90.41, 23.81, 0),
        point: {
          pixelSize: 6,
          color: Cesium.Color.fromCssColorString('#E11D48'),
          outlineColor: Cesium.Color.fromCssColorString('#FFFFFF'),
          outlineWidth: 2,
          heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
          disableDepthTestDistance: Number.POSITIVE_INFINITY,
        },
        label: {
          text: 'TARGET BASIN · 23.81°N, 90.41°E',
          font: '500 10px "JetBrains Mono", monospace',
          fillColor: Cesium.Color.fromCssColorString('#F4F4F6'),
          outlineColor: Cesium.Color.fromCssColorString('#040406'),
          outlineWidth: 3,
          style: Cesium.LabelStyle.FILL_AND_OUTLINE,
          verticalOrigin: Cesium.VerticalOrigin.TOP,
          pixelOffset: new Cesium.Cartesian2(0, 12),
          heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
          disableDepthTestDistance: Number.POSITIVE_INFINITY,
          distanceDisplayCondition: new Cesium.DistanceDisplayCondition(
            0,
            18_000_000
          ),
        },
      });
      referenceEntitiesRef.current.push(targetMarker);

      // Render the 561 real 200m EASE-Grid 2.0 L3 Soil Moisture pixels over Svalbard
      const sme2Center = viewer.entities.add({
        position: Cesium.Cartesian3.fromDegrees(13.945, 77.521, 0),
        properties: { catalogId: SME2_L3_DATASET.granuleId },
        point: {
          pixelSize: 7,
          color: Cesium.Color.fromCssColorString('#A78BFA'),
          outlineColor: Cesium.Color.fromCssColorString('#FFFFFF'),
          outlineWidth: 2,
          heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
          disableDepthTestDistance: Number.POSITIVE_INFINITY,
        },
        label: {
          text: 'NISAR L3 SME2 · 561 SOIL MOISTURE PIXELS (200m EASE-GRID)',
          font: '600 9.5px "JetBrains Mono", monospace',
          fillColor: Cesium.Color.fromCssColorString('#DDD6FE'),
          outlineColor: Cesium.Color.fromCssColorString('#040406'),
          outlineWidth: 3,
          style: Cesium.LabelStyle.FILL_AND_OUTLINE,
          verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
          pixelOffset: new Cesium.Cartesian2(0, -10),
          heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
          disableDepthTestDistance: Number.POSITIVE_INFINITY,
          distanceDisplayCondition: new Cesium.DistanceDisplayCondition(
            0,
            8_500_000
          ),
        },
      });
      referenceEntitiesRef.current.push(sme2Center);

      SME2_L3_DATASET.points.forEach(([lon, lat, sm]) => {
        const ptEntity = viewer.entities.add({
          position: Cesium.Cartesian3.fromDegrees(lon, lat, 0),
          properties: { catalogId: SME2_L3_DATASET.granuleId, soilMoisture: sm },
          point: {
            pixelSize: 4.5,
            color: soilMoistureColor(sm),
            heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
            disableDepthTestDistance: Number.POSITIVE_INFINITY,
            distanceDisplayCondition: new Cesium.DistanceDisplayCondition(
              0,
              650_000
            ),
          },
        });
        referenceEntitiesRef.current.push(ptEntity);
      });

      const handler = new Cesium.ScreenSpaceEventHandler(viewer.scene.canvas);
      handler.setInputAction((event) => {
        const picked = viewer.scene.pick(event.position);
        const entity = picked?.id;
        const property = entity?.properties?.catalogId;
        const id =
          typeof property?.getValue === 'function'
            ? property.getValue()
            : property;
        if (id) onSelectRef.current?.(id);
        else onSelectRef.current?.(null);
      }, Cesium.ScreenSpaceEventType.LEFT_CLICK);
      viewer.__zenithPickHandler = handler;

      setViewerReady(true);
      setStatus({
        state: 'ready',
        message:
          'Interactive 3D Earth · Drag to rotate, scroll to zoom, click any SAR frame to inspect.',
      });
    } catch (error) {
      if (viewer && !viewer.isDestroyed()) {
        viewer.__zenithPickHandler?.destroy();
        viewer.destroy();
      }
      viewerRef.current = null;
      setViewerReady(false);
      setStatus({
        state: 'error',
        message:
          error instanceof Error
            ? `The globe could not start: ${error.message}`
            : 'The globe could not start. Try reloading in a WebGL-capable browser.',
      });
    }

    return () => {
      isCancelled = true;
      footprintEntitiesRef.current.forEach((parts) =>
        parts.forEach((entity) => viewer?.entities.remove(entity))
      );
      footprintEntitiesRef.current.clear();
      referenceEntitiesRef.current.forEach((entity) =>
        viewer?.entities.remove(entity)
      );
      referenceEntitiesRef.current = [];
      if (viewer && !viewer.isDestroyed()) {
        viewer.__zenithPickHandler?.destroy();
        viewer.destroy();
      }
      if (viewerRef.current === viewer) viewerRef.current = null;
    };
  }, []);

  useEffect(() => {
    const viewer = viewerRef.current;
    if (!viewerReady || !viewer || viewer.isDestroyed()) return;

    const entities = footprintEntitiesRef.current;
    for (const parts of entities.values()) {
      parts.forEach((entity) => viewer.entities.remove(entity));
    }
    entities.clear();

    // Group repeat-pass footprints by unique spatial geometry so 75 identical
    // passes don't stack alpha into an opaque purple X.
    const uniqueFootprints = new Map();
    let selectedFeature = null;

    features.forEach((feature) => {
      const id = feature.id ?? feature.properties?.id;
      const level =
        feature.properties?.processingLevel ??
        feature.properties?.productType ??
        '';
      const isRawStrip = level === 'RRSD';

      if (id === selectedId) {
        selectedFeature = feature;
      }

      // Hide long 1,400 km L0B calibration strips by default unless toggled on,
      // filtered specifically to RRSD, or currently selected.
      const onlyRrsdVisible = features.every(
        (f) =>
          (f.properties?.processingLevel ?? f.properties?.productType) ===
          'RRSD'
      );
      if (
        isRawStrip &&
        !showRawStrips &&
        !onlyRrsdVisible &&
        id !== selectedId
      ) {
        return;
      }

      const sig = footprintSignature(feature);
      const existing = uniqueFootprints.get(sig);
      if (!existing) {
        uniqueFootprints.set(sig, {
          feature,
          representativeId: id,
          count: 1,
          isRawStrip,
        });
      } else {
        existing.count += 1;
        existing.representativeId = id;
        existing.feature = feature;
      }
    });

    uniqueFootprints.forEach(
      ({ feature, representativeId, count, isRawStrip }, sig) => {
        const hierarchies = polygonHierarchies(feature);
        if (!hierarchies) return;
        const isSelected =
          selectedFeature && footprintSignature(selectedFeature) === sig;
        if (isSelected) return;

        const isAscending =
          String(feature.properties?.flightDirection ?? '').toUpperCase() ===
          'ASCENDING';
        const trackNum = feature.properties?.pathNumber;
        const fillHex = isRawStrip
          ? '#94a3b8'
          : isAscending
            ? '#a78bfa'
            : '#fb7185';
        const outlineHex = isRawStrip
          ? '#cbd5e1'
          : isAscending
            ? '#ddd6fe'
            : '#fda4af';

        // Drape polygon & polyline border directly onto 3D World Terrain elevation meshes
        const entity = viewer.entities.add({
          properties: { catalogId: representativeId, passCount: count },
        });
        entity.polygon = {
          hierarchy: hierarchies[0],
          material: Cesium.Color.fromCssColorString(fillHex).withAlpha(
            isRawStrip ? 0.06 : 0.2
          ),
          classificationType: Cesium.ClassificationType.BOTH,
        };
        entity.polyline = {
          positions: hierarchies[0].positions,
          width: isRawStrip ? 1.2 : 2.0,
          material: Cesium.Color.fromCssColorString(outlineHex).withAlpha(
            isRawStrip ? 0.4 : 0.88
          ),
          clampToGround: true,
        };

        const center = featureCenter(feature);
        const fBounds = featureBounds(feature);
        if (center && !isRawStrip) {
          const labelLat = fBounds
            ? isAscending
              ? fBounds.north + 0.08
              : fBounds.south - 0.08
            : center.latitude;
          entity.position = Cesium.Cartesian3.fromDegrees(
            center.longitude,
            labelLat,
            0
          );
          const trackLabel = trackNum
            ? `TRK ${String(trackNum).padStart(3, '0')}`
            : feature.properties?.processingLevel ?? 'SAR';
          entity.label = {
            text: `${isAscending ? 'ASC' : 'DSC'} · ${trackLabel} (${count} ${count === 1 ? 'pass' : 'passes'})`,
            font: '500 9.5px "JetBrains Mono", monospace',
            fillColor: Cesium.Color.fromCssColorString(outlineHex),
            outlineColor: Cesium.Color.fromCssColorString('#040406'),
            outlineWidth: 3,
            style: Cesium.LabelStyle.FILL_AND_OUTLINE,
            verticalOrigin: isAscending
              ? Cesium.VerticalOrigin.BOTTOM
              : Cesium.VerticalOrigin.TOP,
            pixelOffset: new Cesium.Cartesian2(0, isAscending ? -10 : 10),
            heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
            disableDepthTestDistance: Number.POSITIVE_INFINITY,
            distanceDisplayCondition: new Cesium.DistanceDisplayCondition(
              0,
              11_000_000
            ),
          };
        }

        const parts = [entity];
        hierarchies.slice(1).forEach((hierarchy) => {
          const part = viewer.entities.add({
            properties: { catalogId: representativeId },
          });
          part.polygon = { ...entity.polygon, hierarchy };
          part.polyline = {
            ...entity.polyline,
            positions: hierarchy.positions,
          };
          parts.push(part);
        });
        entities.set(sig, parts);
      }
    );

    // Render the active selected footprint prominently draped over 3D terrain (when not in compare mode)
    if (selectedFeature && !comparePair) {
      const hierarchies = polygonHierarchies(selectedFeature);
      if (hierarchies) {
        const id = selectedFeature.id ?? selectedFeature.properties?.id;
        const p = selectedFeature.properties ?? {};
        const browseList = Array.isArray(p.browse) ? p.browse : [];
        const latLonBrowseUrl =
          browseList.find((u) => typeof u === 'string' && u.includes('_LATLON')) ??
          browseList[0] ??
          null;
        const bounds = featureBounds(selectedFeature);

        const entity = viewer.entities.add({
          properties: { catalogId: id },
        });
        entity.polygon = {
          hierarchy: hierarchies[0],
          material: Cesium.Color.fromCssColorString('#E11D48').withAlpha(
            latLonBrowseUrl && drapeRadarOnGlobe ? 0.14 : 0.38
          ),
          classificationType: Cesium.ClassificationType.BOTH,
        };
        entity.polyline = {
          positions: hierarchies[0].positions,
          width: 2.8,
          material: Cesium.Color.fromCssColorString('#FFFFFF').withAlpha(1),
          clampToGround: true,
        };

        const parts = [entity];

        // If the record has an authenticated geocoded SAR browse PNG, drape it directly on the 3D globe!
        if (latLonBrowseUrl && drapeRadarOnGlobe && bounds) {
          const proxiedImage = `/api/earthdata-asset?url=${encodeURIComponent(
            latLonBrowseUrl
          )}`;
          const radarDrapeEntity = viewer.entities.add({
            properties: { catalogId: id },
            rectangle: {
              coordinates: Cesium.Rectangle.fromDegrees(
                bounds.west,
                bounds.south,
                bounds.east,
                bounds.north
              ),
              material: new Cesium.ImageMaterialProperty({
                image: proxiedImage,
                transparent: true,
                color: Cesium.Color.WHITE.withAlpha(0.92),
              }),
              classificationType: Cesium.ClassificationType.BOTH,
            },
          });
          parts.push(radarDrapeEntity);
        }

        const center = featureCenter(selectedFeature);
        if (center) {
          const topLat = bounds ? bounds.north + 0.14 : center.latitude;
          entity.position = Cesium.Cartesian3.fromDegrees(
            center.longitude,
            topLat,
            0
          );
          entity.label = {
            text: `SELECTED · ${p.processingLevel ?? p.productType ?? 'SAR'} · ${p.acquisitionDate ?? ''}`,
            font: '600 10px "JetBrains Mono", monospace',
            fillColor: Cesium.Color.fromCssColorString('#FFFFFF'),
            outlineColor: Cesium.Color.fromCssColorString('#E11D48'),
            outlineWidth: 3,
            style: Cesium.LabelStyle.FILL_AND_OUTLINE,
            verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
            pixelOffset: new Cesium.Cartesian2(0, -14),
            heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
            disableDepthTestDistance: Number.POSITIVE_INFINITY,
          };

          // Fly into a tilted 3D terrain perspective when the user selects a new footprint
          if (lastFlownIdRef.current !== id) {
            lastFlownIdRef.current = id;
            const isSme2 = id === SME2_L3_DATASET.granuleId;
            viewer.camera.flyTo({
              destination: Cesium.Cartesian3.fromDegrees(
                isSme2 ? 13.94 : center.longitude,
                isSme2 ? 77.36 : center.latitude - 3.6,
                isSme2 ? 28_000 : 420_000
              ),
              orientation: {
                heading: Cesium.Math.toRadians(0.0),
                pitch: Cesium.Math.toRadians(isSme2 ? -40.0 : -34.0),
                roll: 0.0,
              },
              duration: 1.0,
            });
          }
        }

        hierarchies.slice(1).forEach((hierarchy) => {
          const part = viewer.entities.add({ properties: { catalogId: id } });
          part.polygon = { ...entity.polygon, hierarchy };
          part.polyline = {
            ...entity.polyline,
            positions: hierarchy.positions,
          };
          parts.push(part);
        });
        entities.set(`selected:${id}`, parts);
      }
    }

    if (!viewer.isDestroyed()) viewer.scene.requestRender();
  }, [features, selectedId, viewerReady, showRawStrips, drapeRadarOnGlobe, comparePair]);

  // Synchronize splitPosition when dragging curtain slider
  useEffect(() => {
    const viewer = viewerRef.current;
    if (viewer && !viewer.isDestroyed() && viewer.scene) {
      viewer.scene.splitPosition = splitRatio;
      viewer.scene.requestRender();
    }
  }, [splitRatio]);

  // Handle multi-temporal comparison overlay draping and curtain imagery layers
  useEffect(() => {
    const viewer = viewerRef.current;
    if (!viewer || viewer.isDestroyed() || !viewerReady) return;

    // 1. Clean up previous comparison entities
    compareEntitiesRef.current.forEach((ent) => {
      try {
        viewer.entities.remove(ent);
      } catch {}
    });
    compareEntitiesRef.current = [];

    // 2. Clean up previous curtain imagery layers
    if (curtainLayersRef.current.layerA) {
      try {
        viewer.imageryLayers.remove(curtainLayersRef.current.layerA, true);
      } catch {}
      curtainLayersRef.current.layerA = null;
    }
    if (curtainLayersRef.current.layerB) {
      try {
        viewer.imageryLayers.remove(curtainLayersRef.current.layerB, true);
      } catch {}
      curtainLayersRef.current.layerB = null;
    }

    if (!comparePair?.granuleA || !comparePair?.granuleB || !changeProduct) {
      viewer.scene.splitPosition = 0.5;
      viewer.scene.requestRender();
      return;
    }

    const { bounds, waterClassDataUrl, diffDbDataUrl, dateADataUrl, dateBDataUrl } = changeProduct;
    const pA = comparePair.granuleA.properties ?? comparePair.granuleA;
    const pB = comparePair.granuleB.properties ?? comparePair.granuleB;
    const compareKey = `${comparePair.granuleA.id ?? pA.id}__${comparePair.granuleB.id ?? pB.id}`;

    // Fly camera into tilted 3D terrain view framing both swaths (or global view for cross-location)
    if (lastFlownCompareKeyRef.current !== compareKey && bounds) {
      lastFlownCompareKeyRef.current = compareKey;
      const centerLon = (bounds.west + bounds.east) / 2;
      const centerLat = (bounds.south + bounds.north) / 2;
      const separation = changeProduct.separationKm || 0;
      const altitude = separation > 80
        ? Math.max(800_000, Math.min(14_000_000, separation * 3200))
        : 420_000;
      const pitch = separation > 80 ? -65.0 : -36.0;

      viewer.camera.flyTo({
        destination: Cesium.Cartesian3.fromDegrees(
          centerLon,
          centerLat - (separation > 80 ? 0 : 3.2),
          altitude
        ),
        orientation: {
          heading: 0.0,
          pitch: Cesium.Math.toRadians(pitch),
          roll: 0.0,
        },
        duration: 1.2,
      });
    }

    // Outline Granule A (Violet) and Granule B (Crimson)
    const renderCompareOutline = (feature, hexColor, labelText) => {
      const hierarchies = polygonHierarchies(feature);
      if (!hierarchies) return;
      const ent = viewer.entities.add({
        polyline: {
          positions: hierarchies[0].positions,
          width: 3.0,
          material: Cesium.Color.fromCssColorString(hexColor).withAlpha(1.0),
          clampToGround: true,
        },
      });
      compareEntitiesRef.current.push(ent);

      const center = featureCenter(feature);
      const fBounds = featureBounds(feature);
      if (center) {
        const topLat = fBounds ? fBounds.north + 0.12 : center.latitude;
        const lbl = viewer.entities.add({
          position: Cesium.Cartesian3.fromDegrees(center.longitude, topLat, 0),
          label: {
            text: labelText,
            font: '700 10.5px "JetBrains Mono", monospace',
            fillColor: Cesium.Color.WHITE,
            outlineColor: Cesium.Color.fromCssColorString(hexColor),
            outlineWidth: 3,
            style: Cesium.LabelStyle.FILL_AND_OUTLINE,
            verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
            heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
            disableDepthTestDistance: Number.POSITIVE_INFINITY,
          },
        });
        compareEntitiesRef.current.push(lbl);
      }
    };

    const isCross = changeProduct.isCrossLocation;
    renderCompareOutline(
      comparePair.granuleA,
      '#F4F4F6',
      isCross ? `LOCATION A · ${pA.acquisitionDate ?? 'REF'}` : `DATE A · ${pA.acquisitionDate ?? 'REF'}`
    );
    renderCompareOutline(
      comparePair.granuleB,
      '#E11D48',
      isCross ? `LOCATION B · ${pB.acquisitionDate ?? 'SEC'}` : `DATE B · ${pB.acquisitionDate ?? 'SEC'}`
    );

    // MODE 1: Split-Swipe Curtain (A ◄► B)
    if (compareLayerMode === 'curtain' && bounds) {
      const cesiumRect = Cesium.Rectangle.fromDegrees(
        bounds.west,
        bounds.south,
        bounds.east,
        bounds.north
      );

      const setupCurtain = async () => {
        try {
          const providerA = typeof Cesium.SingleTileImageryProvider?.fromUrl === 'function'
            ? await Cesium.SingleTileImageryProvider.fromUrl(dateADataUrl, { rectangle: cesiumRect })
            : new Cesium.SingleTileImageryProvider({ url: dateADataUrl, rectangle: cesiumRect });

          if (viewer.isDestroyed()) return;
          const layerA = viewer.imageryLayers.addImageryProvider(providerA);
          layerA.splitDirection = Cesium.SplitDirection.LEFT;
          layerA.alpha = 0.95;
          curtainLayersRef.current.layerA = layerA;

          const providerB = typeof Cesium.SingleTileImageryProvider?.fromUrl === 'function'
            ? await Cesium.SingleTileImageryProvider.fromUrl(dateBDataUrl, { rectangle: cesiumRect })
            : new Cesium.SingleTileImageryProvider({ url: dateBDataUrl, rectangle: cesiumRect });

          if (viewer.isDestroyed()) return;
          const layerB = viewer.imageryLayers.addImageryProvider(providerB);
          layerB.splitDirection = Cesium.SplitDirection.RIGHT;
          layerB.alpha = 0.95;
          curtainLayersRef.current.layerB = layerB;

          viewer.scene.splitPosition = splitRatio;
          viewer.scene.requestRender();
        } catch (err) {
          console.warn('Curtain imagery setup error:', err);
        }
      };

      setupCurtain();
    } else {
      // MODE 2 & 3: Draped Radar Overlays
      viewer.scene.splitPosition = 0.5;

      if (isCross) {
        // Dual-region cross-location: drape Granule A over boundsA and Granule B over boundsB
        if (changeProduct.boundsA && dateADataUrl) {
          const drapeA = viewer.entities.add({
            properties: { isCompareDrape: true },
            rectangle: {
              coordinates: Cesium.Rectangle.fromDegrees(
                changeProduct.boundsA.west,
                changeProduct.boundsA.south,
                changeProduct.boundsA.east,
                changeProduct.boundsA.north
              ),
              material: new Cesium.ImageMaterialProperty({
                image: dateADataUrl,
                transparent: true,
                color: Cesium.Color.WHITE.withAlpha(compareOpacity),
              }),
              classificationType: Cesium.ClassificationType.BOTH,
            },
          });
          compareEntitiesRef.current.push(drapeA);
        }

        if (changeProduct.boundsB && dateBDataUrl) {
          const drapeB = viewer.entities.add({
            properties: { isCompareDrape: true },
            rectangle: {
              coordinates: Cesium.Rectangle.fromDegrees(
                changeProduct.boundsB.west,
                changeProduct.boundsB.south,
                changeProduct.boundsB.east,
                changeProduct.boundsB.north
              ),
              material: new Cesium.ImageMaterialProperty({
                image: dateBDataUrl,
                transparent: true,
                color: Cesium.Color.WHITE.withAlpha(compareOpacity),
              }),
              classificationType: Cesium.ClassificationType.BOTH,
            },
          });
          compareEntitiesRef.current.push(drapeB);
        }
      } else {
        // Same-location repeat-pass pair: drape 4-Class Flood Mask or Backscatter ΔdB
        const drapeUrl =
          compareLayerMode === 'diffDb' ? diffDbDataUrl : waterClassDataUrl;

        if (drapeUrl && bounds) {
          const drapeEnt = viewer.entities.add({
            properties: { isCompareDrape: true },
            rectangle: {
              coordinates: Cesium.Rectangle.fromDegrees(
                bounds.west,
                bounds.south,
                bounds.east,
                bounds.north
              ),
              material: new Cesium.ImageMaterialProperty({
                image: drapeUrl,
                transparent: true,
                color: Cesium.Color.WHITE.withAlpha(compareOpacity),
              }),
              classificationType: Cesium.ClassificationType.BOTH,
            },
          });
          compareEntitiesRef.current.push(drapeEnt);
        }
      }
    }

    viewer.scene.requestRender();

    return () => {
      compareEntitiesRef.current.forEach((ent) => {
        try {
          viewer.entities.remove(ent);
        } catch {}
      });
      compareEntitiesRef.current = [];
      if (curtainLayersRef.current.layerA) {
        try {
          viewer.imageryLayers.remove(curtainLayersRef.current.layerA, true);
        } catch {}
        curtainLayersRef.current.layerA = null;
      }
      if (curtainLayersRef.current.layerB) {
        try {
          viewer.imageryLayers.remove(curtainLayersRef.current.layerB, true);
        } catch {}
        curtainLayersRef.current.layerB = null;
      }
    };
  }, [
    comparePair,
    changeProduct,
    compareLayerMode,
    compareOpacity,
    viewerReady,
  ]);

  const handleDividerPointerDown = (e) => {
    e.preventDefault();
    if (!hostRef.current) return;
    const host = hostRef.current;
    const onPointerMove = (moveEvt) => {
      const rect = host.getBoundingClientRect();
      const ratio = Math.max(0.05, Math.min(0.95, (moveEvt.clientX - rect.left) / rect.width));
      onSplitRatioChange?.(ratio);
    };
    const onPointerUp = () => {
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
    };
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
  };

  return (
    <section className="x-globe-card" aria-label="3D catalog footprint globe">
      <style>{`
        .x-globe-card {
          position: relative;
          min-height: 430px;
          height: 100%;
          overflow: hidden;
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 20px;
          background: radial-gradient(ellipse at 50% 45%, rgba(139, 92, 246, 0.09) 0%, #040406 72%);
          box-shadow:
            0 24px 60px -15px rgba(0, 0, 0, 0.85),
            inset 0 1px 0 0 rgba(255, 255, 255, 0.18),
            inset 0 -1px 0 0 rgba(255, 255, 255, 0.04);
          color: #F4F4F6;
        }
        .x-globe-card::before {
          content: "";
          pointer-events: none;
          position: absolute;
          left: 36px;
          right: 36px;
          top: 0;
          height: 1px;
          z-index: 6;
          background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.32), transparent);
        }
        .x-globe-host,
        .x-globe-host .cesium-viewer,
        .x-globe-host .cesium-viewer-cesiumWidgetContainer,
        .x-globe-host .cesium-widget {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
        }
        .x-globe-host canvas { outline: none; }
        .x-globe-kicker {
          position: absolute;
          top: 12px;
          left: 12px;
          right: 12px;
          z-index: 5;
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          justify-content: space-between;
          gap: 8px;
          pointer-events: none;
        }
        .x-globe-kicker-pill {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 6px 12px;
          border: 1px solid rgba(255, 255, 255, 0.15);
          border-radius: 999px;
          background: rgba(4, 4, 6, 0.42);
          backdrop-filter: blur(18px) saturate(140%);
          -webkit-backdrop-filter: blur(18px) saturate(140%);
          font-family: "JetBrains Mono", monospace;
          font-size: 9.5px;
          letter-spacing: 0.16em;
          text-transform: uppercase;
          color: rgba(255, 255, 255, 0.9);
          text-shadow: 0 1px 2px rgba(0, 0, 0, 0.85);
          box-shadow: 0 4px 16px rgba(0, 0, 0, 0.35), inset 0 1px 0 rgba(255, 255, 255, 0.15);
          white-space: nowrap;
        }
        .x-terrain-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: #10B981;
          box-shadow: 0 0 8px rgba(16, 185, 129, 0.8);
        }
        .x-globe-controls {
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          gap: 6px;
          pointer-events: auto;
        }
        .x-globe-btn {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          height: 28px;
          padding: 0 10px;
          border-radius: 999px;
          border: 1px solid rgba(255, 255, 255, 0.15);
          background: rgba(4, 4, 6, 0.42);
          backdrop-filter: blur(18px) saturate(140%);
          -webkit-backdrop-filter: blur(18px) saturate(140%);
          color: rgba(255, 255, 255, 0.9);
          text-shadow: 0 1px 2px rgba(0, 0, 0, 0.85);
          box-shadow: 0 4px 16px rgba(0, 0, 0, 0.35), inset 0 1px 0 rgba(255, 255, 255, 0.15);
          font-family: "JetBrains Mono", monospace;
          font-size: 9.5px;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          cursor: pointer;
          transition: all 0.2s ease;
          white-space: nowrap;
        }
        .x-globe-btn:hover {
          border-color: rgba(255, 255, 255, 0.35);
          color: #FFFFFF;
          background: rgba(255, 255, 255, 0.14);
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.25);
        }
        .x-globe-btn.is-active {
          border-color: rgba(251, 113, 133, 0.6);
          background: rgba(225, 29, 72, 0.35);
          color: #FFFFFF;
          box-shadow: 0 0 14px rgba(225, 29, 72, 0.45);
        }
        .x-globe-error {
          position: absolute;
          inset: 0;
          z-index: 4;
          display: grid;
          place-content: center;
          padding: 28px;
          text-align: center;
          background: radial-gradient(ellipse at center, rgba(225, 29, 72, 0.1), #040406 70%);
        }
        .x-globe-error h3 {
          font-family: "Space Grotesk", sans-serif;
          margin: 0 0 8px;
          font-size: 17px;
          font-weight: 500;
          color: #FFFFFF;
        }
        .x-globe-error p {
          max-width: 360px;
          margin: 0;
          color: rgba(244, 244, 246, 0.62);
          font-size: 13px;
          line-height: 1.6;
        }
        .x-globe-card .cesium-widget-credits {
          font-size: 8px !important;
          opacity: 0.35;
        }
        .x-curtain-container {
          position: absolute;
          inset: 0;
          pointer-events: none;
          z-index: 15;
        }
        .x-curtain-divider {
          position: absolute;
          top: 0;
          bottom: 0;
          width: 3px;
          background: #F4F4F6;
          box-shadow: 0 0 16px rgba(225, 29, 72, 0.75);
          transform: translateX(-50%);
          pointer-events: auto;
          cursor: ew-resize;
          z-index: 16;
        }
        .x-curtain-handle-knob {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          width: 36px;
          height: 36px;
          border-radius: 9999px;
          background: #08080C;
          border: 2px solid #E11D48;
          color: #F4F4F6;
          display: flex;
          align-items: center;
          justify-content: center;
          font-family: 'Space Grotesk', sans-serif;
          font-size: 11px;
          font-weight: 700;
          box-shadow: 0 4px 20px rgba(4, 4, 6, 0.9), 0 0 12px rgba(225, 29, 72, 0.5);
          transition: transform 0.15s ease, background 0.15s ease;
        }
        .x-curtain-divider:hover .x-curtain-handle-knob {
          transform: translate(-50%, -50%) scale(1.1);
          background: #E11D48;
        }
        .x-curtain-pill-left {
          position: absolute;
          top: calc(50% - 44px);
          right: 20px;
          background: rgba(12, 12, 18, 0.88);
          backdrop-filter: blur(20px);
          border: 1px solid rgba(255, 255, 255, 0.25);
          color: #F4F4F6;
          font-family: 'JetBrains Mono', monospace;
          font-size: 10px;
          font-weight: 700;
          padding: 4px 10px;
          border-radius: 6px;
          white-space: nowrap;
          pointer-events: none;
          box-shadow: 0 4px 16px rgba(4, 4, 6, 0.8);
        }
        .x-curtain-pill-right {
          position: absolute;
          top: calc(50% - 44px);
          left: 20px;
          background: rgba(12, 12, 18, 0.88);
          backdrop-filter: blur(20px);
          border: 1px solid rgba(251, 113, 133, 0.5);
          color: #FB7185;
          font-family: 'JetBrains Mono', monospace;
          font-size: 10px;
          font-weight: 700;
          padding: 4px 10px;
          border-radius: 6px;
          white-space: nowrap;
          pointer-events: none;
          box-shadow: 0 4px 16px rgba(4, 4, 6, 0.8);
        }
        @media (max-width: 620px) {
          .x-globe-card { min-height: 340px; border-radius: 16px; }
          .x-globe-kicker { flex-wrap: wrap; }
        }
      `}</style>

      <div
        className="x-globe-host"
        ref={hostRef}
        role="img"
        aria-label={`Interactive 3D Earth globe showing ${features.length} catalog acquisition footprints. A complete keyboard-accessible observation list follows the globe; select a record there to update the highlighted footprint and details.`}
      />

      {/* Interactive Split-Swipe Curtain Divider Handle */}
      {comparePair && compareLayerMode === 'curtain' && (
        <div className="x-curtain-container">
          <div
            className="x-curtain-divider"
            style={{ left: `${splitRatio * 100}%` }}
            onPointerDown={handleDividerPointerDown}
            title="Drag horizontally to swipe between Date A and Date B"
          >
            <div className="x-curtain-handle-knob">◄►</div>
            <div className="x-curtain-pill-left">
              ◄ DATE A: {comparePair.granuleA?.properties?.acquisitionDate ?? 'REF'}
            </div>
            <div className="x-curtain-pill-right">
              {comparePair.granuleB?.properties?.acquisitionDate ?? 'SEC'} ►
            </div>
          </div>
        </div>
      )}
      <div className="x-globe-kicker">
        <div className="x-globe-kicker-pill">
          <DiamondCrosshair />
          <span>ORBITAL COVERAGE · 3D GLOBE</span>
          {terrainActive && (
            <span
              className="x-terrain-dot"
              title="Cesium Ion 3D World Terrain Active"
            />
          )}
        </div>
        <div className="x-globe-controls" role="toolbar" aria-label="3D Globe Camera Views">
          <button
            type="button"
            className="x-globe-btn"
            onClick={flyTo3DTerrain}
            title="Tilted 3D perspective showing Himalayan mountain elevation meshes & SAR swaths"
          >
            <Mountain size={11} aria-hidden="true" />
            <span>3D Peaks</span>
          </button>
          <button
            type="button"
            className="x-globe-btn"
            onClick={flyToSvalbardSme2}
            title="Fly to parsed NISAR L3 Soil Moisture (SME2) 561-pixel 200m EASE-Grid 2.0 over Svalbard"
          >
            <Sparkles size={11} aria-hidden="true" />
            <span>Svalbard L3</span>
          </button>
          <button
            type="button"
            className="x-globe-btn"
            onClick={flyToRegion}
            title="Zoom to target SAR frames (Meghna-Brahmaputra Basin)"
          >
            <Focus size={11} aria-hidden="true" />
            <span>Target</span>
          </button>
          <button
            type="button"
            className="x-globe-btn"
            onClick={flyToGlobal}
            title="Reset to full planetary horizon view"
          >
            <Globe2 size={11} aria-hidden="true" />
            <span>Globe</span>
          </button>
          <button
            type="button"
            className={`x-globe-btn${showRawStrips ? ' is-active' : ''}`}
            onClick={() => setShowRawStrips((prev) => !prev)}
            aria-pressed={showRawStrips}
            title="Toggle 1,400 km L0B RRSD raw radar orbit strips"
          >
            <Layers size={11} aria-hidden="true" />
            <span>L0B Strips</span>
          </button>
        </div>
      </div>
      {status.state !== 'ready' && status.state !== 'loading' && (
        <div className="x-globe-error" role="alert">
          <div>
            <h3>3D view unavailable</h3>
            <p>{status.message}</p>
          </div>
        </div>
      )}
    </section>
  );
}
