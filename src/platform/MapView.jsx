import { useEffect, useRef } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

// Mapa de prospecção (Leaflet + mapa escuro CARTO/OpenStreetMap).
// - clique no mapa: adiciona uma área com o raio atual
// - arraste o centro de uma área para movê-la
// - pontos: empresas encontradas (cor por aderência / presença digital)
export default function MapView({ basemapKey = '', onViewChange, view, areas, results, selectedId, onAddArea, onMoveArea, onSelect, fitKey, flyTo, addMode }) {
  const el = useRef(null)
  const map = useRef(null)
  const areaLayer = useRef(null)
  const resultLayer = useRef(null)
  const markers = useRef(new Map())
  const handlers = useRef({})
  handlers.current = { onAddArea, onMoveArea, onSelect, addMode, onViewChange }

  // cria o mapa uma única vez
  useEffect(() => {
    const m = L.map(el.current, { zoomControl: true, worldCopyJump: true, preferCanvas: true }).setView([view.lat, view.lng], view.zoom)
    areaLayer.current = L.layerGroup().addTo(m)
    resultLayer.current = L.layerGroup().addTo(m)
    const report = () => {
      const c = m.getCenter()
      handlers.current.onViewChange?.({ lat: c.lat, lng: c.lng, zoom: m.getZoom() })
    }
    m.on('moveend', report)
    setTimeout(report, 0)
    m.on('click', e => {
      if (handlers.current.addMode) handlers.current.onAddArea?.(e.latlng)
    })
    map.current = m
    const ro = new ResizeObserver(() => m.invalidateSize())
    ro.observe(el.current)
    return () => {
      ro.disconnect()
      m.remove()
      map.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // mapas base CARTO (com a chave da conta, quando configurada) + seletor de estilo
  useEffect(() => {
    const m = map.current
    if (!m) return
    const ATTR = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
    const tiles = style =>
      L.tileLayer(
        basemapKey
          ? `https://basemaps.cartocdn.com/rastertiles/${style}/{z}/{x}/{y}{r}.png?key=${encodeURIComponent(basemapKey)}`
          : `https://{s}.basemaps.cartocdn.com/${style}/{z}/{x}/{y}{r}.png`,
        { maxZoom: 19, subdomains: 'abcd', attribution: ATTR }
      )
    const layers = { Escuro: tiles('dark_all'), Voyager: tiles('voyager') }
    let saved = 'Escuro'
    try { saved = localStorage.getItem('argus:basemap') || 'Escuro' } catch { /* sem armazenamento */ }
    ;(layers[saved] || layers.Escuro).addTo(m)
    const control = L.control.layers(layers, null, { position: 'topright' }).addTo(m)
    const remember = e => { try { localStorage.setItem('argus:basemap', e.name) } catch { /* sem armazenamento */ } }
    m.on('baselayerchange', remember)
    return () => {
      m.off('baselayerchange', remember)
      control.remove()
      Object.values(layers).forEach(l => l.remove())
    }
  }, [basemapKey])

  // centraliza ao trocar de país
  useEffect(() => {
    map.current?.setView([view.lat, view.lng], view.zoom)
  }, [view.lat, view.lng, view.zoom])

  // voa para um local pesquisado
  useEffect(() => {
    if (!flyTo || !map.current) return
    if (flyTo.bbox) {
      const [s, n, w, e] = flyTo.bbox
      map.current.flyToBounds([[s, w], [n, e]], { maxZoom: 15, duration: 0.8 })
    } else map.current.flyTo([flyTo.lat, flyTo.lng], 14, { duration: 0.8 })
  }, [flyTo])

  // desenha as áreas
  useEffect(() => {
    const layer = areaLayer.current
    if (!layer) return
    layer.clearLayers()
    areas.forEach((a, i) => {
      L.circle([a.lat, a.lng], {
        radius: a.radiusKm * 1000,
        color: '#a78bfa',
        weight: 1.5,
        fillColor: '#8b5cf6',
        fillOpacity: 0.08,
        dashArray: '6 6',
        interactive: false,
      }).addTo(layer)
      const handle = L.marker([a.lat, a.lng], {
        draggable: true,
        icon: L.divIcon({ className: 'area-pin', html: `<span>${i + 1}</span>`, iconSize: [26, 26], iconAnchor: [13, 13] }),
        title: `${a.label} — arraste para mover`,
      }).addTo(layer)
      handle.on('dragend', e => handlers.current.onMoveArea?.(i, e.target.getLatLng()))
    })
  }, [areas])

  // desenha os resultados
  useEffect(() => {
    const layer = resultLayer.current
    if (!layer) return
    layer.clearLayers()
    markers.current.clear()
    results.forEach(r => {
      const color = r.high_fit ? '#c4b5fd' : !r.has_website ? '#f472b6' : '#6b6880'
      const mk = L.circleMarker([r.lat, r.lng], {
        radius: r.high_fit ? 6 : 4.5,
        color: r.captured ? '#ffffff' : color,
        weight: r.captured ? 2 : 1,
        fillColor: color,
        fillOpacity: 0.9,
      })
      mk.bindTooltip(`${escapeHtml(r.name)}${r.high_fit ? ' · alta aderência' : ''}${!r.has_website ? ' · sem website' : ''}`, { direction: 'top' })
      mk.on('click', () => handlers.current.onSelect?.(r.id))
      mk.addTo(layer)
      markers.current.set(r.id, mk)
    })
  }, [results])

  // destaca o selecionado
  useEffect(() => {
    const mk = markers.current.get(selectedId)
    if (!mk || !map.current) return
    mk.setStyle({ radius: 10 })
    mk.openTooltip()
    if (!map.current.getBounds().contains(mk.getLatLng())) map.current.panTo(mk.getLatLng())
    return () => mk.setStyle({ radius: 5 })
  }, [selectedId, results])

  // sincroniza: enquadra todas as áreas
  useEffect(() => {
    if (!fitKey || !map.current || !areas.length) return
    const bounds = L.latLngBounds([])
    areas.forEach(a => bounds.extend(L.latLng(a.lat, a.lng).toBounds(a.radiusKm * 2000)))
    map.current.flyToBounds(bounds, { padding: [30, 30], duration: 0.8 })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fitKey])

  return <div ref={el} className={`map ${addMode ? 'map--add' : ''}`} />
}

const escapeHtml = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c])
