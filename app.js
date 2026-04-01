'use strict';

// ?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧
// SECTION 1: VIRTUAL DOM CORE  (Week 3)
// ?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧

function createVNode(type, props, children) {
  return { type: type, props: props || {}, children: children || [] };
}
function createTextVNode(value) {
  return { type: 'TEXT_NODE', props: {}, children: [], value: String(value) };
}

var SVG_TAGS = ['svg','polygon','polyline','circle','rect','line','path','g','text','defs','clipPath','use','ellipse'];
var SVG_NS = 'http://www.w3.org/2000/svg';

function renderVNode(vnode) {
  if (!vnode) return document.createTextNode('');
  if (vnode.type === 'TEXT_NODE') return document.createTextNode(vnode.value);
  var el;
  if (SVG_TAGS.indexOf(vnode.type) >= 0) {
    el = document.createElementNS(SVG_NS, vnode.type);
  } else {
    el = document.createElement(vnode.type);
  }
  var keys = Object.keys(vnode.props);
  for (var i = 0; i < keys.length; i++) el.setAttribute(keys[i], vnode.props[keys[i]]);
  for (var j = 0; j < vnode.children.length; j++) {
    var child = renderVNode(vnode.children[j]);
    if (child) el.appendChild(child);
  }
  return el;
}

function cloneVNode(vnode) {
  if (!vnode) return null;
  if (vnode.type === 'TEXT_NODE') return createTextVNode(vnode.value);
  return createVNode(vnode.type, JSON.parse(JSON.stringify(vnode.props)), vnode.children.map(cloneVNode).filter(Boolean));
}

// ?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧
// SECTION 2: DIFF ALGORITHM  (Week 3)
// ?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧

var CREATE = 'CREATE', REMOVE = 'REMOVE', REPLACE = 'REPLACE', UPDATE = 'UPDATE';

function diff(oldV, newV) {
  if (!oldV && newV) return { type: CREATE, newVNode: newV };
  if (oldV && !newV) return { type: REMOVE };
  if (!oldV && !newV) return null;
  if (oldV.type !== newV.type) return { type: REPLACE, newVNode: newV };
  if (oldV.type === 'TEXT_NODE') {
    return oldV.value !== newV.value ? { type: REPLACE, newVNode: newV } : null;
  }
  var propPatches = diffProps(oldV.props, newV.props);
  var childPatches = diffChildren(oldV.children, newV.children);
  if (!propPatches.length && !childPatches.length) return null;
  return { type: UPDATE, propPatches: propPatches, childPatches: childPatches };
}
function diffProps(oldP, newP) {
  var patches = [];
  var nk = Object.keys(newP);
  for (var i = 0; i < nk.length; i++) {
    if (oldP[nk[i]] !== newP[nk[i]]) patches.push({ action: 'SET', key: nk[i], value: newP[nk[i]] });
  }
  var ok = Object.keys(oldP);
  for (var j = 0; j < ok.length; j++) {
    if (!(ok[j] in newP)) patches.push({ action: 'REMOVE', key: ok[j] });
  }
  return patches;
}
function diffChildren(oldC, newC) {
  var patches = [];
  var max = Math.max(oldC.length, newC.length);
  for (var i = 0; i < max; i++) {
    var p = diff(i < oldC.length ? oldC[i] : null, i < newC.length ? newC[i] : null);
    if (p) patches.push({ index: i, patch: p });
  }
  return patches;
}

// ?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧
// SECTION 3: PATCH SYSTEM  (Week 3)
// ?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧

function realChildren(parent) {
  var result = [];
  for (var i = 0; i < parent.childNodes.length; i++) {
    var c = parent.childNodes[i];
    if (c.nodeType === Node.TEXT_NODE && c.textContent.trim() === '') continue;
    result.push(c);
  }
  return result;
}
function applyPatch(parent, node, patch) {
  if (!patch) return;
  switch (patch.type) {
    case CREATE: parent.appendChild(renderVNode(patch.newVNode)); break;
    case REMOVE: if (node && node.parentNode) node.parentNode.removeChild(node); break;
    case REPLACE:
      var ne = renderVNode(patch.newVNode);
      if (node && node.parentNode) node.parentNode.replaceChild(ne, node);
      else parent.appendChild(ne);
      break;
    case UPDATE:
      if (patch.propPatches) {
        for (var i = 0; i < patch.propPatches.length; i++) {
          var pp = patch.propPatches[i];
          if (pp.action === 'SET') {
            node.setAttribute(pp.key, pp.value);
            if (pp.key === 'style') node.style.cssText = pp.value;
            if (pp.key === 'class') node.className = pp.value;
          } else node.removeAttribute(pp.key);
        }
      }
      if (patch.childPatches && patch.childPatches.length > 0) applyChildPatches(node, patch.childPatches);
      break;
  }
}
function applyChildPatches(parent, childPatches) {
  var sorted = childPatches.slice().sort(function(a, b) { return b.index - a.index; });
  for (var i = 0; i < sorted.length; i++) {
    if (sorted[i].patch.type === REMOVE) {
      var kids = realChildren(parent);
      if (kids[sorted[i].index]) parent.removeChild(kids[sorted[i].index]);
    }
  }
  var others = childPatches.filter(function(cp) { return cp.patch.type !== REMOVE; });
  others.sort(function(a, b) { return a.index - b.index; });
  for (var j = 0; j < others.length; j++) {
    var cp = others[j];
    var ch = realChildren(parent);
    if (cp.patch.type === CREATE) {
      var nn = renderVNode(cp.patch.newVNode);
      if (cp.index >= ch.length) parent.appendChild(nn);
      else parent.insertBefore(nn, ch[cp.index]);
    } else {
      if (ch[cp.index]) applyPatch(parent, ch[cp.index], cp.patch);
    }
  }
}

// ?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧
// SECTION 4: MINI REACT FRAMEWORK  (Week 4)
// ?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧

var currentComponent = null;

class FunctionComponent {
  constructor(fn, props) {
    this.fn = fn; this.props = props || {};
    this.hooks = []; this.hookIndex = 0;
    this.vdom = null; this.container = null; this.rootEl = null;
    this.isMounted = false; this._updateScheduled = false;
    this._patchLog = [];
  }
  mount(container) {
    this.container = container;
    currentComponent = this; this.hookIndex = 0;
    this.vdom = this.fn(this.props);
    this.rootEl = renderVNode(this.vdom);
    container.appendChild(this.rootEl);
    this.isMounted = true;
    this._runEffects();
    currentComponent = null;
  }
  update() {
    if (this._updateScheduled) return;
    this._updateScheduled = true;
    var self = this;
    requestAnimationFrame(function() {
      self._updateScheduled = false;
      currentComponent = self; self.hookIndex = 0;
      var newVdom = self.fn(self.props);
      var patch = diff(self.vdom, newVdom);
      if (patch) {
        self._patchLog.push({ ts: Date.now(), patch: patch });
        if (self._patchLog.length > 50) self._patchLog.shift();
        applyPatch(self.container, self.rootEl, patch);
        if (patch.type === REPLACE) self.rootEl = realChildren(self.container)[0];
      }
      self.vdom = newVdom;
      self._runEffects();
      currentComponent = null;
    });
  }
  _runEffects() {
    for (var i = 0; i < this.hooks.length; i++) {
      var h = this.hooks[i];
      if (h._type === 'effect' && h._needsRun) {
        if (typeof h._cleanup === 'function') h._cleanup();
        h._cleanup = h._callback() || null;
        h._needsRun = false;
      }
    }
  }
}

// ?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧
// SECTION 5: HOOKS  (Week 4)
// ?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧

function useState(init) {
  var comp = currentComponent, idx = comp.hookIndex++;
  if (idx >= comp.hooks.length) comp.hooks.push({ _type: 'state', _value: init });
  var hook = comp.hooks[idx];
  var setState = function(v) {
    var nv = typeof v === 'function' ? v(hook._value) : v;
    if (nv === hook._value) return;
    hook._value = nv;
    comp.update();
  };
  return [hook._value, setState];
}

function useEffect(callback, deps) {
  var comp = currentComponent, idx = comp.hookIndex++;
  var hasDeps = arguments.length >= 2;
  if (idx >= comp.hooks.length) {
    comp.hooks.push({ _type: 'effect', _callback: callback, _deps: hasDeps ? (deps || []).slice() : undefined, _cleanup: null, _needsRun: true });
  } else {
    var h = comp.hooks[idx];
    h._callback = callback;
    if (!hasDeps) { h._needsRun = true; }
    else { var nd = (deps || []).slice(); if (!_depsEq(h._deps, nd)) { h._needsRun = true; h._deps = nd; } }
  }
}

function useMemo(factory, deps) {
  var comp = currentComponent, idx = comp.hookIndex++;
  if (idx >= comp.hooks.length) {
    comp.hooks.push({ _type: 'memo', _value: factory(), _deps: deps ? deps.slice() : null });
  } else {
    var h = comp.hooks[idx];
    if (!_depsEq(h._deps, deps)) { h._value = factory(); h._deps = deps ? deps.slice() : null; }
  }
  return comp.hooks[idx]._value;
}

function _depsEq(a, b) {
  if (!a || !b) return false;
  if (a.length !== b.length) return false;
  for (var i = 0; i < a.length; i++) { if (a[i] !== b[i]) return false; }
  return true;
}

// ?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧
// SECTION 6: UTILITIES
// ?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧

function pointInPolygon(px, py, poly) {
  var inside = false;
  for (var i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    var xi = poly[i].x, yi = poly[i].y, xj = poly[j].x, yj = poly[j].y;
    if (((yi > py) !== (yj > py)) && (px < (xj - xi) * (py - yi) / (yj - yi) + xi)) inside = !inside;
  }
  return inside;
}
function polygonArea(pts) {
  var a = 0;
  for (var i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    a += (pts[j].x + pts[i].x) * (pts[j].y - pts[i].y);
  }
  return Math.abs(a / 2);
}
function segmentIntersection(a1, a2, b1, b2) {
  var aDx = a2.x - a1.x, aDy = a2.y - a1.y;
  var bDx = b2.x - b1.x, bDy = b2.y - b1.y;
  var denom = aDx * bDy - aDy * bDx;
  if (Math.abs(denom) < 0.0001) return null;
  var sDx = b1.x - a1.x, sDy = b1.y - a1.y;
  var t = (sDx * bDy - sDy * bDx) / denom;
  var u = (sDx * aDy - sDy * aDx) / denom;
  if (t < 0 || t > 1 || u < 0 || u > 1) return null;
  return { x: a1.x + aDx * t, y: a1.y + aDy * t, t: t };
}
function findPolygonImpactPoint(start, end, poly) {
  var best = null;
  for (var i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    var hit = segmentIntersection(start, end, poly[j], poly[i]);
    if (hit && (!best || hit.t < best.t)) best = hit;
  }
  return best ? { x: best.x, y: best.y } : null;
}
function findPolygonSurfacePoint(origin, target, poly) {
  var dx = target.x - origin.x, dy = target.y - origin.y;
  var len = Math.sqrt(dx * dx + dy * dy);
  if (len < 0.0001) return null;
  var farPoint = { x: origin.x + (dx / len) * 4000, y: origin.y + (dy / len) * 4000 };
  return findPolygonImpactPoint(origin, farPoint, poly);
}
/** 鍮꾨???醫낇슒鍮? 泥댄겕 ??ratio > limit?대㈃ ?덈Т 湲몄춬 */
function aspectRatioOk(pts, limit) {
  var minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (var i = 0; i < pts.length; i++) {
    if (pts[i].x < minX) minX = pts[i].x; if (pts[i].x > maxX) maxX = pts[i].x;
    if (pts[i].y < minY) minY = pts[i].y; if (pts[i].y > maxY) maxY = pts[i].y;
  }
  var w = maxX - minX, h = maxY - minY;
  if (w < 30 || h < 30) return false; // ?덈Т ?묒쓬
  var ratio = Math.max(w, h) / Math.max(1, Math.min(w, h));
  return ratio <= (limit || 4);
}
/** ?ъ씤?멸? ?대뼡 zone ?대????덈뒗吏 寃????寃뱀튂??zone ??諛섑솚 */
function countCoverage(px, py, zones) {
  var count = 0;
  for (var i = 0; i < zones.length; i++) {
    if (pointInPolygon(px, py, zones[i].points)) count++;
  }
  return count;
}
var DEFAULT_SIM_CITY_ID = 'telaviv';
var DEFAULT_SIM_BBOX = '34.748,32.055,34.810,32.100';
function buildSatUrl(w, h, cityId) {
  var city = typeof getDefenseCityById === 'function' ? getDefenseCityById(cityId) : null;
  var bbox = city ? city.bbox : DEFAULT_SIM_BBOX;
  var dpr = Math.min(window.devicePixelRatio || 1, 2);
  var rw = Math.round(w * dpr), rh = Math.round(h * dpr);
  return 'https://services.arcgisonline.com/arcgis/rest/services/World_Imagery/MapServer/export'
    + '?bbox=' + bbox + '&bboxSR=4326&size=' + rw + ',' + rh
    + '&imageSR=4326&format=jpg&f=image';
}
/** sim-view ?곸뿭 ?ㅽ봽???곸닔 */
var SIM_TOP = 52, SIM_BOTTOM = 44;
/** ?꾩꽦 ?대?吏 URL 罹먯떆 */
var _cachedSatUrl = '';
var _cachedSatKey = '';
/** ?꾩떆蹂??꾩꽦 ?띿뒪泥??꾨━濡쒕뱶 罹먯떆 */
var _cityTexCache = {}; // cityId ??THREE.Texture
function getSimSatUrl(w, h, cityId) {
  var dpr = Math.min(window.devicePixelRatio || 1, 2);
  var key = (cityId || DEFAULT_SIM_CITY_ID) + ':' + Math.round(w) + 'x' + Math.round(h) + '@' + dpr;
  if (_cachedSatKey !== key) {
    _cachedSatUrl = buildSatUrl(w, h, cityId);
    _cachedSatKey = key;
  }
  return _cachedSatUrl;
}
function getDefaultDronePos() {
  var simH = window.innerHeight - SIM_TOP - SIM_BOTTOM;
  return { x: Math.round(window.innerWidth / 2), y: Math.round(simH / 2) };
}
function _makeCirclePoints(cx, cy, rx, ry, n) {
  var pts = [];
  for (var i = 0; i < n; i++) {
    var angle = (i / n) * Math.PI * 2 - Math.PI / 2;
    pts.push({ x: Math.round(cx + Math.cos(angle) * rx), y: Math.round(cy + Math.sin(angle) * ry) });
  }
  return pts;
}
// 諛섏썝 (?댁븞??吏곸꽑 而ㅽ똿?? ??angle from~to in radians
function _makeArcPoints(cx, cy, rx, ry, n, fromAngle, toAngle) {
  var pts = [];
  for (var i = 0; i <= n; i++) {
    var angle = fromAngle + (toAngle - fromAngle) * (i / n);
    pts.push({ x: Math.round(cx + Math.cos(angle) * rx), y: Math.round(cy + Math.sin(angle) * ry) });
  }
  return pts;
}
function _makeRectPoints(cx, cy, w, h) {
  var hw = Math.round(w / 2), hh = Math.round(h / 2);
  return [
    { x: cx - hw, y: cy - hh },
    { x: cx + hw, y: cy - hh },
    { x: cx + hw, y: cy + hh },
    { x: cx - hw, y: cy + hh }
  ];
}
function _dedupePoints(points) {
  var cleaned = [];
  for (var i = 0; i < points.length; i++) {
    var prev = cleaned[cleaned.length - 1];
    if (!prev || prev.x !== points[i].x || prev.y !== points[i].y) cleaned.push(points[i]);
  }
  if (cleaned.length > 2) {
    var first = cleaned[0], last = cleaned[cleaned.length - 1];
    if (first.x === last.x && first.y === last.y) cleaned.pop();
  }
  return cleaned;
}
function _makeCapsulePoints(cx, cy, w, h, n) {
  var pts = [];
  var steps = Math.max(6, n || 12);
  if (w >= h) {
    var hr = h / 2;
    var leftCx = cx - (w / 2 - hr);
    var rightCx = cx + (w / 2 - hr);
    for (var i = 0; i <= steps; i++) {
      var a1 = Math.PI / 2 + Math.PI * (i / steps);
      pts.push({ x: Math.round(leftCx + Math.cos(a1) * hr), y: Math.round(cy + Math.sin(a1) * hr) });
    }
    for (var j = 0; j <= steps; j++) {
      var a2 = -Math.PI / 2 + Math.PI * (j / steps);
      pts.push({ x: Math.round(rightCx + Math.cos(a2) * hr), y: Math.round(cy + Math.sin(a2) * hr) });
    }
  } else {
    var vr = w / 2;
    var topCy = cy - (h / 2 - vr);
    var bottomCy = cy + (h / 2 - vr);
    for (var ti = 0; ti <= steps; ti++) {
      var aTop = Math.PI + Math.PI * (ti / steps);
      pts.push({ x: Math.round(cx + Math.cos(aTop) * vr), y: Math.round(topCy + Math.sin(aTop) * vr) });
    }
    for (var bi = 0; bi <= steps; bi++) {
      var aBottom = Math.PI * (bi / steps);
      pts.push({ x: Math.round(cx + Math.cos(aBottom) * vr), y: Math.round(bottomCy + Math.sin(aBottom) * vr) });
    }
  }
  return _dedupePoints(pts);
}
function _makeClippedEllipsePoints(cx, cy, rx, ry, n, clipX) {
  var pts = [];
  for (var i = 0; i < n; i++) {
    var angle = (i / n) * Math.PI * 2 - Math.PI / 2;
    var px = Math.round(cx + Math.cos(angle) * rx);
    var py = Math.round(cy + Math.sin(angle) * ry);
    if (typeof clipX === 'number' && px < clipX) px = clipX;
    pts.push({ x: px, y: py });
  }
  return _dedupePoints(pts);
}
function _zoneObj(points, extra) {
  var cx = 0, cy = 0;
  for (var i = 0; i < points.length; i++) { cx += points[i].x; cy += points[i].y; }
  cx = Math.round(cx / points.length); cy = Math.round(cy / points.length);
  var zone = { id: _zoneId++, capacity: 5000, maxConcurrent: 100, active: 0, points: points, center: { x: cx, y: cy } };
  if (extra) {
    for (var key in extra) zone[key] = extra[key];
  }
  return zone;
}

function _generateCityZones(cityId) {
  var w = window.innerWidth, h = window.innerHeight - SIM_TOP - SIM_BOTTOM;
  var cx = Math.round(w / 2), cy = Math.round(h / 2);
  var r = Math.min(w, h);

  if (cityId === 'telaviv') {
    var coastClipX = Math.round(cx - w * 0.16);
    var taNorthCoast = _makeClippedEllipsePoints(Math.round(cx - w * 0.01), Math.round(cy - h * 0.18), Math.round(r * 0.15), Math.round(r * 0.10), 30, coastClipX);
    var taSouthCoast = _makeClippedEllipsePoints(Math.round(cx + w * 0.01), Math.round(cy + h * 0.16), Math.round(r * 0.14), Math.round(r * 0.10), 30, coastClipX);
    var taDowntown = _makeCirclePoints(Math.round(cx + w * 0.11), Math.round(cy - h * 0.02), Math.round(r * 0.11), Math.round(r * 0.11), 28);
    var taMetro = _makeCapsulePoints(Math.round(cx + w * 0.22), Math.round(cy + h * 0.10), Math.round(r * 0.20), Math.round(r * 0.10), 12);
    return [
      _zoneObj(taNorthCoast, { renderMode: 'extrude', height: 150 }),
      _zoneObj(taSouthCoast, { renderMode: 'extrude', height: 148 }),
      _zoneObj(taDowntown, { renderMode: 'dome', height: 162 }),
      _zoneObj(taMetro, { renderMode: 'extrude', height: 138 })
    ];
  }

  if (cityId === 'jerusalem') {
    var jCenter = _makeCirclePoints(cx, Math.round(cy - h * 0.08), Math.round(r * 0.14), Math.round(r * 0.14), 30);
    var jSouthWest = _makeCirclePoints(Math.round(cx - w * 0.11), Math.round(cy + h * 0.08), Math.round(r * 0.13), Math.round(r * 0.13), 26);
    var jSouthEast = _makeCirclePoints(Math.round(cx + w * 0.11), Math.round(cy + h * 0.08), Math.round(r * 0.13), Math.round(r * 0.13), 26);
    return [
      _zoneObj(jCenter, { renderMode: 'dome', height: 176 }),
      _zoneObj(jSouthWest, { renderMode: 'dome', height: 162 }),
      _zoneObj(jSouthEast, { renderMode: 'dome', height: 162 })
    ];
  }

  if (cityId === 'haifa') {
    var haifaClipX = Math.round(cx - w * 0.18);
    var hfHarbor = _makeClippedEllipsePoints(Math.round(cx - w * 0.08), Math.round(cy - h * 0.12), Math.round(r * 0.11), Math.round(r * 0.09), 28, haifaClipX);
    var hfBay = _makeCirclePoints(Math.round(cx + w * 0.03), Math.round(cy - h * 0.02), Math.round(r * 0.10), Math.round(r * 0.10), 24);
    var hfCarmel = _makeCapsulePoints(Math.round(cx + w * 0.16), Math.round(cy + h * 0.16), Math.round(r * 0.24), Math.round(r * 0.10), 12);
    var hfEast = _makeCirclePoints(Math.round(cx + w * 0.23), Math.round(cy - h * 0.10), Math.round(r * 0.08), Math.round(r * 0.08), 20);
    return [
      _zoneObj(hfHarbor, { renderMode: 'extrude', height: 144 }),
      _zoneObj(hfBay, { renderMode: 'dome', height: 154 }),
      _zoneObj(hfCarmel, { renderMode: 'extrude', height: 136 }),
      _zoneObj(hfEast, { renderMode: 'dome', height: 142 })
    ];
  }

  if (cityId === 'sderot') {
    var sdFrontNorth = _makeCapsulePoints(Math.round(cx - w * 0.16), Math.round(cy - h * 0.10), Math.round(r * 0.10), Math.round(r * 0.18), 10);
    var sdFrontSouth = _makeCapsulePoints(Math.round(cx - w * 0.14), Math.round(cy + h * 0.10), Math.round(r * 0.10), Math.round(r * 0.16), 10);
    var sdCore = _makeCirclePoints(Math.round(cx - w * 0.01), Math.round(cy - h * 0.02), Math.round(r * 0.11), Math.round(r * 0.11), 24);
    var sdRear = _makeCirclePoints(Math.round(cx + w * 0.11), Math.round(cy + h * 0.06), Math.round(r * 0.10), Math.round(r * 0.10), 22);
    return [
      _zoneObj(sdFrontNorth, { renderMode: 'extrude', height: 138 }),
      _zoneObj(sdFrontSouth, { renderMode: 'extrude', height: 136 }),
      _zoneObj(sdCore, { renderMode: 'dome', height: 152 }),
      _zoneObj(sdRear, { renderMode: 'dome', height: 146 })
    ];
  }

  if (cityId === 'ashkelon') {
    var akNorthWest = _makeCirclePoints(Math.round(cx - w * 0.11), Math.round(cy - h * 0.12), Math.round(r * 0.10), Math.round(r * 0.10), 22);
    var akNorthEast = _makeCirclePoints(Math.round(cx + w * 0.08), Math.round(cy - h * 0.11), Math.round(r * 0.10), Math.round(r * 0.10), 22);
    var akSouth = _makeCapsulePoints(Math.round(cx - w * 0.01), Math.round(cy + h * 0.17), Math.round(r * 0.22), Math.round(r * 0.10), 12);
    var akEast = _makeRectPoints(Math.round(cx + w * 0.20), Math.round(cy + h * 0.03), Math.round(r * 0.12), Math.round(r * 0.10));
    return [
      _zoneObj(akNorthWest, { renderMode: 'extrude', height: 162 }),
      _zoneObj(akNorthEast, { renderMode: 'extrude', height: 162 }),
      _zoneObj(akSouth, { renderMode: 'extrude', height: 148 }),
      _zoneObj(akEast, { renderMode: 'extrude', height: 140 })
    ];
  }

  return [
    _zoneObj(_makeCirclePoints(Math.round(cx - w * 0.15), Math.round(cy - h * 0.14), Math.round(r * 0.10), Math.round(r * 0.10), 22), { renderMode: 'extrude', height: 156 }),
    _zoneObj(_makeCirclePoints(Math.round(cx + w * 0.15), Math.round(cy - h * 0.14), Math.round(r * 0.10), Math.round(r * 0.10), 22), { renderMode: 'extrude', height: 156 }),
    _zoneObj(_makeCapsulePoints(Math.round(cx - w * 0.12), Math.round(cy + h * 0.16), Math.round(r * 0.16), Math.round(r * 0.09), 10), { renderMode: 'extrude', height: 144 }),
    _zoneObj(_makeRectPoints(Math.round(cx + w * 0.12), Math.round(cy + h * 0.16), Math.round(r * 0.12), Math.round(r * 0.10)), { renderMode: 'extrude', height: 140 })
  ];
}

function createDefaultSimState(cityId) {
  return {
    dronePos: getDefaultDronePos(),
    droneAlive: true,
    droneAngle: 0,
    radarZones: _generateCityZones(cityId || DEFAULT_SIM_CITY_ID),
    missiles: [],
    breaches: [],
    targets: [],
    interceptors: [],
    totalAttacks: 0
  };
}
function cloneSimState(state) {
  var src = state || createDefaultSimState();
  return {
    dronePos: { x: src.dronePos.x, y: src.dronePos.y },
    droneAlive: src.droneAlive !== false,
    droneAngle: src.droneAngle || 0,
    radarZones: (src.radarZones || []).map(function(z) {
      return Object.assign({}, z, {
        center: { x: z.center.x, y: z.center.y },
        points: z.points.map(function(p) { return { x: p.x, y: p.y }; })
      });
    }),
    missiles: (src.missiles || []).map(function(m) { return Object.assign({}, m); }),
    breaches: (src.breaches || []).map(function(b) { return Object.assign({}, b); }),
    targets: (src.targets || []).map(function(t) { return Object.assign({}, t); }),
    interceptors: (src.interceptors || []).map(function(it) { return Object.assign({}, it); }),
    totalAttacks: src.totalAttacks || 0
  };
}
function buildZoneSignature(zones) {
  if (!zones || zones.length === 0) return 'none';
  return zones.map(function(z) {
    var pts = (z.points || []).map(function(p) { return Math.round(p.x) + ',' + Math.round(p.y); }).join(';');
    return [z.id, z.capacity || 0, z.renderMode || 'extrude', z.height || 0, pts].join(':');
  }).join('|');
}
/** clientY ??sim-view ?대? 醫뚰몴 蹂??*/
function toSimY(clientY) { return clientY - SIM_TOP; }
/** 痍⑥빟 吏??洹몃━??怨꾩궛 ???덉씠??而ㅻ쾭 ???섎뒗 怨?*/
function computeVulnerableGrid(zones, w, simH, step) {
  var pts = [];
  for (var x = step; x < w; x += step) {
    for (var y = step; y < simH; y += step) {
      if (countCoverage(x, y, zones) === 0) pts.push({ x: x, y: y });
    }
  }
  return pts;
}
function randomEdgePos(targetX, targetY, w, simH) {
  var edge = Math.floor(Math.random() * 4);
  switch (edge) {
    case 0: return { x: Math.random() * w, y: 0 }; // top
    case 1: return { x: Math.random() * w, y: simH }; // bottom
    case 2: return { x: 0, y: Math.random() * simH }; // left
    case 3: return { x: w, y: Math.random() * simH }; // right
  }
}
function pad2(n) {
  return n < 10 ? '0' + n : String(n);
}
function formatClock(date) {
  return pad2(date.getHours()) + ':' + pad2(date.getMinutes()) + ':' + pad2(date.getSeconds());
}
var INTERCEPT_TRAVEL_MS = 260, INTERCEPT_POP_MS = 220;
var NATIONAL_MISSILE_SPEED = 36;
var CITY_TERMINAL_SECONDS = { min: 1.8, max: 2.8 };
var NATIONAL_ZOOM_TRIGGER_SECONDS = 2.6;
var MULTI3D_LAUNCH_DELAY_MS = 1500;
var MULTI3D_FOCUS_MS = 6000;
var NATIONAL_OVERVIEW_PAUSE_MS = 3000;
function randRange(min, max) {
  return min + Math.random() * (max - min);
}
function computeTravelSpeed(distance, durationSeconds) {
  return distance / Math.max(0.001, durationSeconds);
}
function buildNationalMissileSpeed(startX, startY, targetX, targetY, type) {
  // ?꾨룄誘몄궗?? ?쇰컲蹂대떎 ?쎄컙 ?먮━寃?(?쒓컖???꾪삊媛?
  if (type === 'ballistic') return NATIONAL_MISSILE_SPEED * 0.9;
  if (type === 'drone') return NATIONAL_MISSILE_SPEED * 0.85;
  return NATIONAL_MISSILE_SPEED;
}
/** 誘몄궗????낆씠 ?꾨룄(BALLISTIC)?몄? ?먮퀎 */
function isBallistic(type) { return type === 'ballistic'; }

// ?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧
// SECTION 6b: NATIONAL DEFENSE DATA
// ?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧

/** ?댁뒪?쇱뿕 ?꾩껜 bbox ???붾㈃ 鍮꾩쑉??留욊쾶 ?숈쟻 怨꾩궛 */
var NAT_LAT_MIN = 29.4, NAT_LAT_MAX = 33.5, NAT_LON_CENTER = 35.0;
var _cachedNationalUrl = '';
var _cachedNationalKey = '';

function getNationalBbox(w, h) {
  var latRange = NAT_LAT_MAX - NAT_LAT_MIN; // 4.1
  var aspect = w / Math.max(1, h); // ?붾㈃ 醫낇슒鍮?
  var lonRange = latRange * aspect;
  return {
    lonMin: NAT_LON_CENTER - lonRange / 2,
    latMin: NAT_LAT_MIN,
    lonMax: NAT_LON_CENTER + lonRange / 2,
    latMax: NAT_LAT_MAX
  };
}

function buildNationalSatUrl(w, h) {
  var bb = getNationalBbox(w, h);
  var dpr = Math.min(window.devicePixelRatio || 1, 2);
  return 'https://services.arcgisonline.com/arcgis/rest/services/World_Imagery/MapServer/export'
    + '?bbox=' + bb.lonMin + ',' + bb.latMin + ',' + bb.lonMax + ',' + bb.latMax
    + '&bboxSR=4326&size=' + Math.round(w * dpr) + ',' + Math.round(h * dpr)
    + '&imageSR=4326&format=jpg&f=image';
}
function getNationalSatUrl(w, h) {
  var dpr = Math.min(window.devicePixelRatio || 1, 2);
  var key = Math.round(w) + 'x' + Math.round(h) + '@' + dpr;
  if (_cachedNationalKey !== key) {
    _cachedNationalUrl = buildNationalSatUrl(w, h);
    _cachedNationalKey = key;
  }
  return _cachedNationalUrl;
}

/** ?꾧꼍?????붾㈃ ?쎌? 蹂??(援?? 吏?꾩슜) */
function geoToScreen(lon, lat, w, h) {
  var bb = getNationalBbox(w, h);
  var x = ((lon - bb.lonMin) / (bb.lonMax - bb.lonMin)) * w;
  var y = ((bb.latMax - lat) / (bb.latMax - bb.latMin)) * h;
  return { x: Math.round(x), y: Math.round(y) };
}

/** 諛⑹뼱 ?꾩떆 ?곗씠??*/
var DEFENSE_CITIES = [
  { id: 'telaviv', name: 'Tel Aviv', lat: 32.08, lon: 34.78, bbox: '34.748,32.055,34.810,32.100' },
  { id: 'sderot', name: 'Sderot', lat: 31.52, lon: 34.60, bbox: '34.570,31.500,34.630,31.540' },
  { id: 'ashkelon', name: 'Ashkelon', lat: 31.67, lon: 34.57, bbox: '34.530,31.645,34.610,31.695' },
  { id: 'haifa', name: 'Haifa', lat: 32.79, lon: 34.99, bbox: '34.940,32.770,35.040,32.830' },
  { id: 'jerusalem', name: 'Jerusalem', lat: 31.77, lon: 35.23, bbox: '35.190,31.745,35.270,31.800' }
];
function hasDefenseCityId(cityId) {
  for (var i = 0; i < DEFENSE_CITIES.length; i++) {
    if (DEFENSE_CITIES[i].id === cityId) return true;
  }
  return false;
}
function getDefenseCityById(cityId) {
  var wanted = cityId || DEFAULT_SIM_CITY_ID;
  for (var i = 0; i < DEFENSE_CITIES.length; i++) {
    if (DEFENSE_CITIES[i].id === wanted) return DEFENSE_CITIES[i];
  }
  return DEFENSE_CITIES[0] || null;
}
function sameIdList(a, b) {
  if (a === b) return true;
  if (!a || !b) return !a && !b;
  if (a.length !== b.length) return false;
  for (var i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}
function buildCityFocusList(primaryIds, secondaryIds, limit) {
  var result = [];
  var max = limit || 4;
  function append(list) {
    if (!list) return;
    for (var i = 0; i < list.length && result.length < max; i++) {
      var cityId = list[i];
      if (!cityId || result.indexOf(cityId) >= 0) continue;
      if (!hasDefenseCityId(cityId)) continue;
      result.push(cityId);
    }
  }
  append(primaryIds);
  append(secondaryIds);
  return result;
}

/** ?꾪삊 異쒕컻吏 ?곗씠??*/
var THREAT_ORIGINS = [
  { id: 'gaza', name: 'Gaza', lat: 31.42, lon: 34.35, color: '#ff4444' },
  { id: 'lebanon', name: 'S. Lebanon', lat: 33.35, lon: 35.30, color: '#ff6644' },
  { id: 'iran', name: 'Iran', lat: 32.5, lon: 36.0, color: '#ff2222', edge: true },
  { id: 'yemen', name: 'Yemen', lat: 29.5, lon: 35.2, color: '#ff8844', edge: true },
  { id: 'syria', name: 'Syria/Iraq', lat: 33.4, lon: 36.0, color: '#ff5533', edge: true }
];

/** True Promise (2024.04.13) ?쒕굹由ъ삤 ???대? ???댁뒪?쇱뿕 ?洹쒕え 怨듦꺽 */
var SCENARIOS = {
  'true-promise': {
    name: 'Operation True Promise ??April 13, 2024',
    desc: 'Iran launches 300+ drones & missiles at Israel',
    waves: [
      // ?? 1?ъ씠?? ?대? ?좎젣?寃? 3?꾩떆 遺꾩궛 ??
      { time: 0,     from: 'iran',    targets: ['telaviv', 'jerusalem', 'haifa'], count: 8,  type: 'ballistic' },
      // ?? 2?ъ씠?? ?붿븘鍮꾨툕 臾댁옄鍮?吏묒쨷??꺽 (1?꾩떆, 3諛⑺뼢 ?숈떆) ??
      { time: 4000,  from: 'iran',    targets: ['telaviv'],                       count: 20, type: 'ballistic' },
      { time: 4300,  from: 'gaza',    targets: ['telaviv'],                       count: 14, type: 'rocket' },
      { time: 4600,  from: 'lebanon', targets: ['telaviv'],                       count: 10, type: 'cruise' },
      // ?? 3?ъ씠?? ?⑤? 2?꾩떆 ??
      { time: 9000,  from: 'yemen',   targets: ['ashkelon', 'sderot'],            count: 8,  type: 'drone' },
      { time: 10000, from: 'gaza',    targets: ['sderot'],                        count: 8,  type: 'rocket' },
      // ?? 4?ъ씠?? ?섏씠???ы솕怨듦꺽 ??諛⑷났留?珥덇낵, ???愿????
      { time: 14000, from: 'lebanon', targets: ['haifa'],                         count: 25, type: 'rocket' },
      { time: 14400, from: 'syria',   targets: ['haifa'],                         count: 18, type: 'cruise' },
      { time: 14800, from: 'iran',    targets: ['haifa'],                         count: 12, type: 'ballistic' },
      // ?? 5?ъ씠?? ?꾨㈃??4?꾩떆 ?숈떆 ??
      { time: 19500, from: 'iran',    targets: ['telaviv', 'jerusalem', 'haifa'], count: 10, type: 'ballistic' },
      { time: 20000, from: 'gaza',    targets: ['sderot', 'ashkelon'],            count: 10, type: 'rocket' },
      { time: 20500, from: 'lebanon', targets: ['haifa'],                         count: 8,  type: 'rocket' },
      // ?? 6?ъ씠?? ?덈（?대젞 理쒖쥌 ?寃???
      { time: 25000, from: 'iran',    targets: ['jerusalem'],                     count: 16, type: 'ballistic' },
      { time: 25300, from: 'syria',   targets: ['jerusalem'],                     count: 12, type: 'cruise' }
    ]
  }
};

/** 援?? 誘몄궗???곗씠??*/
var _natMissileId = 0;

/** ?꾩떆蹂??꾩꽦 ?띿뒪泥??꾨━濡쒕뱶 ??DEFENSE_CITIES ?뺤쓽 ???ㅽ뻾 */
(function() {
  if (typeof THREE !== 'undefined') {
    var loader = new THREE.TextureLoader();
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var pw = Math.round(600 * dpr), ph = Math.round(500 * dpr);
    for (var i = 0; i < DEFENSE_CITIES.length; i++) {
      (function(city) {
        var satUrl = 'https://services.arcgisonline.com/arcgis/rest/services/World_Imagery/MapServer/export'
          + '?bbox=' + city.bbox + '&bboxSR=4326&size=' + pw + ',' + ph
          + '&imageSR=4326&format=jpg&f=image';
        loader.load(satUrl, function(tex) { _cityTexCache[city.id] = tex; });
      })(DEFENSE_CITIES[i]);
    }
  }
})();

// ?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧
// SECTION 7: CHILD COMPONENTS (Stateless)
// ?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧

function TopBar(props) {
  var modeEl = [];
  if (props.activeView === '3d' && props.targetMode) modeEl.push(createVNode('span', { class: 'topbar-mode mode-target' }, [createTextVNode('Target input')]));
  else if (props.activeView === '3d') modeEl.push(createVNode('span', { class: 'topbar-mode mode-fly' }, [createTextVNode('Terminal view')]));
  else if (props.isDrawing) modeEl.push(createVNode('span', { class: 'topbar-mode mode-draw' }, [createTextVNode('Sector edit')]));


  return createVNode('div', { class: 'topbar' }, [
    createVNode('div', { class: 'topbar-logo' }, [
      createVNode('span', { class: 'dot' }, []),
      createTextVNode('Israel Iron Dome')
    ]),
  ].concat(modeEl).concat([
    createVNode('div', { class: 'topbar-tabs' }, [
      createVNode('button', { class: 'tab-btn' + (props.activeView === 'national' ? ' active' : ''), 'data-action': 'view-national' }, [createTextVNode('National')]),
      createVNode('button', { class: 'tab-btn' + (props.activeView === 'sim' ? ' active' : ''), 'data-action': 'view-sim' }, [createTextVNode('Sector')]),
      createVNode('button', { class: 'tab-btn' + (props.activeView === '3d' || props.activeView === 'multi3d' ? ' active' : ''), 'data-action': 'view-3d' }, [createTextVNode('3D View')]),
      createVNode('button', { class: 'tab-btn' + (props.activeView === 'test' ? ' active' : ''), 'data-action': 'view-test' }, [createTextVNode('Tests')]),
      createVNode('button', { class: 'tab-btn' + (props.activeView === 'briefing' ? ' active' : ''), 'data-action': 'view-briefing' }, [createTextVNode('Briefing')])
    ])
  ]));
}

function SimView(props) {
  var satStyle = 'background-image:url(' + getSimSatUrl(window.innerWidth, window.innerHeight - SIM_TOP - SIM_BOTTOM, props.cityId) + ')';
  var cls = 'sim-view';
  if (props.isDrawing) cls += ' drawing-mode';
  else if (props.targetMode) cls += ' target-mode';
  if (!props.visible) cls += ' hidden';

  // Radar zones SVG
  var zoneEls = [];
  for (var zi = 0; zi < props.radarZones.length; zi++) {
    var zone = props.radarZones[zi];
    var pts = zone.points.map(function(p) { return p.x + ',' + p.y; }).join(' ');
    var capPct = Math.round((zone.capacity / 5000) * 100);
    var capColor = capPct > 50 ? 'rgba(0,255,65,' : (capPct > 20 ? 'rgba(255,145,0,' : 'rgba(255,68,68,');
    zoneEls.push(createVNode('g', {}, [
      createVNode('polygon', { points: pts, fill: capColor + '0.25)', stroke: capColor + '0.85)', 'stroke-width': '3', 'stroke-dasharray': '10,5', class: 'radar-zone' }, []),
      createVNode('text', { x: String(zone.center.x), y: String(zone.center.y - 8), fill: capColor + '0.7)', 'font-size': '9', 'font-family': 'IBM Plex Mono', 'text-anchor': 'middle' }, [createTextVNode('Sector ' + zone.id)]),
      createVNode('text', { x: String(zone.center.x), y: String(zone.center.y + 6), fill: capColor + '0.9)', 'font-size': '11', 'font-family': 'IBM Plex Mono', 'font-weight': '700', 'text-anchor': 'middle' }, [createTextVNode(zone.capacity + '/5000')])
    ]));
  }

  // Draw preview
  if (props.drawPoints.length > 1) {
    var dpts = props.drawPoints.map(function(p) { return p.x + ',' + p.y; }).join(' ');
    zoneEls.push(createVNode('polyline', { points: dpts, fill: 'none', stroke: 'rgba(255,200,0,0.7)', 'stroke-width': '2', 'stroke-dasharray': '6,4' }, []));
  }

  var svgEl = createVNode('svg', { class: 'radar-svg', xmlns: SVG_NS }, zoneEls);

  // Missiles
  var missileEls = [];
  var interceptorEls = [];
  var now = Date.now();
  for (var mi = 0; mi < props.missiles.length; mi++) {
    var m = props.missiles[mi];
    if (m.intercepted) {
      var elapsed = now - (m.interceptTime || now);
      var travelMs = m.interceptorTravelMs || INTERCEPT_TRAVEL_MS;
      var popMs = m.interceptorPopMs || INTERCEPT_POP_MS;
      if (elapsed < travelMs) {
        missileEls.push(createVNode('div', { class: 'missile', style: 'left:' + Math.round(m.x) + 'px;top:' + Math.round(m.y) + 'px' }, []));
      } else if (elapsed < travelMs + popMs) {
        missileEls.push(createVNode('div', { class: 'missile intercepted', style: 'left:' + Math.round(m.x) + 'px;top:' + Math.round(m.y) + 'px' }, []));
      }
      continue;
    }
    if (!m.active) continue;
    missileEls.push(createVNode('div', { class: 'missile', style: 'left:' + Math.round(m.x) + 'px;top:' + Math.round(m.y) + 'px' }, []));
  }
  for (var ii = 0; ii < props.interceptors.length; ii++) {
    var interceptor = props.interceptors[ii];
    if (now - interceptor.launchedAt > interceptor.travelMs) continue;
    interceptorEls.push(createVNode('div', {
      class: 'interceptor-missile',
      style: 'left:' + Math.round(interceptor.startX) + 'px;top:' + Math.round(interceptor.startY) + 'px;--dx:' + Math.round(interceptor.targetX - interceptor.startX) + 'px;--dy:' + Math.round(interceptor.targetY - interceptor.startY) + 'px;--flight-ms:' + interceptor.travelMs + 'ms'
    }, []));
  }

  // Breach dots
  var breachEls = [];
  for (var bi = 0; bi < props.breaches.length; bi++) {
    var b = props.breaches[bi];
    breachEls.push(createVNode('div', { class: 'breach-dot', style: 'left:' + b.x + 'px;top:' + b.y + 'px' }, []));
  }

  // Vulnerable grid
  var vulnEls = [];
  for (var vi = 0; vi < props.vulnPoints.length; vi++) {
    var vp = props.vulnPoints[vi];
    vulnEls.push(createVNode('div', { class: 'vuln-dot', style: 'left:' + vp.x + 'px;top:' + vp.y + 'px' }, []));
  }

  // Target markers
  var targetEls = [];
  for (var ti = 0; ti < props.targets.length; ti++) {
    var t = props.targets[ti];
    targetEls.push(createVNode('div', { class: 'target-marker', style: 'left:' + t.x + 'px;top:' + t.y + 'px' }, []));
  }

  return createVNode('div', { class: cls, style: satStyle, 'data-sim': 'true' },
    [svgEl].concat(missileEls).concat(interceptorEls).concat(breachEls).concat(vulnEls).concat(targetEls));
}

function InfoPanel(props) {
  if (props.activeView !== 'sim' && props.activeView !== '3d') return createVNode('div', { class: 'info-panel hidden' }, []);

  var totalCap = 0;
  var zoneChips = [];
  for (var i = 0; i < props.radarZones.length; i++) {
    var z = props.radarZones[i];
    totalCap += z.capacity;
    var capCls = z.capacity > 2500 ? 'cap' : (z.capacity > 1000 ? 'cap low' : 'cap empty');
    zoneChips.push(createVNode('div', { class: 'zone-chip' }, [
      createTextVNode('Sector ' + z.id),
      createVNode('span', { class: capCls }, [createTextVNode(z.capacity + '/5000')])
    ]));
  }

  return createVNode('div', { class: 'info-panel' }, [
    createVNode('div', { class: 'info-section' }, [
      createVNode('div', { class: 'info-label' }, [createTextVNode('Display mode')]),
      createVNode('div', { class: 'info-value' }, [createTextVNode(props.activeView === '3d' ? props.cityName + ' terminal view' : props.cityName + ' sector view')])
    ]),
    createVNode('div', { class: 'info-section' }, [
      createVNode('div', { class: 'info-label' }, [createTextVNode('Current time')]),
      createVNode('div', { class: 'info-value' }, [createTextVNode(props.currentTimeLabel)])
    ]),
    createVNode('div', { class: 'info-section' }, [
      createVNode('div', { class: 'info-label' }, [createTextVNode('Intercept capacity')]),
      createVNode('div', { class: 'info-value' }, [createTextVNode(totalCap + ' rounds available')]),
      createVNode('div', { class: 'info-bar' }, [
        createVNode('div', { class: 'info-bar-fill green', style: 'width:' + Math.min(100, totalCap / 3) + '%' }, [])
      ])
    ]),
    createVNode('div', { class: 'info-section' }, [
      createVNode('div', { class: 'info-label' }, [createTextVNode('Total threat tracks')]),
      createVNode('div', { class: 'info-value', style: props.totalAttacks > 0 ? 'color:var(--missile-orange)' : '' }, [
        createTextVNode(props.totalAttacks + ' registered')
      ])
    ]),
    createVNode('div', { class: 'info-section' }, [
      createVNode('div', { class: 'info-label' }, [createTextVNode('Active inbound tracks')]),
      createVNode('div', { class: 'info-value', style: props.activeMissiles > 0 ? 'color:var(--missile-orange)' : '' }, [
        createTextVNode(props.activeMissiles + ' inbound')
      ])
    ]),
    createVNode('div', { class: 'info-section' }, [
      createVNode('div', { class: 'info-label' }, [createTextVNode('Confirmed penetrations')]),
      createVNode('div', { class: 'info-value', style: props.breachCount > 0 ? 'color:var(--alert-red)' : '' }, [
        createTextVNode(props.breachCount + ' penetrations')
      ])
    ]),
    createVNode('div', { class: 'info-section' }, [
      createVNode('div', { class: 'info-label' }, [createTextVNode('Defense sectors (' + props.radarZones.length + ')')]),
      createVNode('div', { class: 'zone-list' }, zoneChips)
    ])
  ]);
}

function StatusBar(props) {
  var items = [
    createVNode('span', { class: 'status-item' }, [
      createVNode('span', { class: 'indicator green' }, []),
      createTextVNode('Sectors ' + props.zoneCount)
    ])
  ];

  if (props.activeView === 'sim' || props.activeView === '3d') {
    items.push(createVNode('span', { class: 'status-item' }, [
      createVNode('span', { class: 'indicator green' }, []),
      createTextVNode('City ' + props.cityName)
    ]));
  }

  items.push(createVNode('span', { class: 'status-item' }, [
    createVNode('span', { class: 'indicator green' }, []),
    createTextVNode('Time ' + props.currentTimeLabel)
  ]));

  items.push(createVNode('span', { class: 'status-item' }, [
    createVNode('span', { class: 'indicator orange' }, []),
    createTextVNode('Threats ' + props.totalAttacks)
  ]));

  if (props.activeMissiles > 0) {
    items.push(createVNode('span', { class: 'status-item' }, [
      createVNode('span', { class: 'indicator orange' }, []),
      createTextVNode('Inbound ' + props.activeMissiles)
    ]));
  }

  if (props.activeView === 'sim') {
    items.push(createVNode('button', { class: 'status-btn' + (props.isDrawing ? ' active' : ''), 'data-action': 'toggle-draw' }, [
      createTextVNode(props.isDrawing ? 'Editing sectors' : 'Edit sectors')
    ]));
    if (props.zoneCount > 0) {
      items.push(createVNode('button', { class: 'status-btn clear', 'data-action': 'clear-all' }, [createTextVNode('Reset city')]));
    }
  }
  if (props.activeView === '3d') {
    items.push(createVNode('button', { class: 'status-btn' + (props.targetMode ? ' target-active' : ''), 'data-action': 'toggle-target' }, [
      createTextVNode(props.targetMode ? 'Target input on' : 'Add target')
    ]));
    if (props.zoneCount > 0) {
      items.push(createVNode('button', { class: 'status-btn clear', 'data-action': 'clear-all' }, [createTextVNode('Reset view')]));
    }
  }

  items.push(createVNode('span', { class: 'status-spacer' }, []));
  if (props.totalArea > 0) {
    items.push(createVNode('span', { class: 'status-area' }, [createTextVNode(Math.round(props.totalArea).toLocaleString() + 'px짼')]));
  }

  return createVNode('div', { class: 'statusbar' }, items);
}

function CitySelector(props) {
  if (props.activeView !== 'sim') return createVNode('div', { class: 'city-selector hidden' }, []);
  var buttons = [];
  for (var i = 0; i < DEFENSE_CITIES.length; i++) {
    var city = DEFENSE_CITIES[i];
    buttons.push(createVNode('button', {
      class: 'city-selector-btn' + (props.cityId === city.id ? ' active' : ''),
      'data-action': 'select-sim-city-' + city.id
    }, [createTextVNode(city.name)]));
  }
  return createVNode('div', { class: 'city-selector' }, [
    createVNode('div', { class: 'city-selector-title' }, [createTextVNode('City')]),
    createVNode('div', { class: 'city-selector-row' }, buttons),
    createVNode('div', { class: 'city-selector-caption' }, [createTextVNode(props.cityName + ' loaded')])
  ]);
}

function ControlsHelp(props) {
  if (props.activeView !== 'sim') return createVNode('div', { style: 'display:none' }, []);
  return createVNode('div', { class: 'controls-help' }, [
    createVNode('div', {}, [
      createTextVNode('Select a map point to assign an inbound threat track')
    ]),
    createVNode('div', {}, [
      createTextVNode('Press and drag to establish a defended sector')
    ])
  ]);
}

function DrawHint(props) {
  if (props.ratioWarn) return createVNode('div', { class: 'ratio-warn' }, [createTextVNode(typeof props.ratioWarn === 'string' ? props.ratioWarn : 'Sector boundary invalid')]);
  if (!props.isDrawing || props.activeView !== 'sim') return createVNode('div', { style: 'display:none' }, []);
  return createVNode('div', { class: 'draw-hint' }, [createTextVNode('Press and drag to establish a defended sector. Release to commit the boundary.')]);
}

// ?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧
// 3D VIEW ??Three.js (2D ?쒕??덉씠???곗씠???ㅼ떆媛??곕룞)
// ?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧
var _threeScene = null, _threeRenderer = null, _threeCamera = null;
var _threeAnimId = null, _threeInitialized = false;
var _3dMissileMap = {};   // 2D missile id ??{ meshes }
var _3dZoneMap = {};      // 2D zone id ??{ dome, outline }
var _3dExplosions = [];
var _3dBreachMarkers = [];

/** 2D ?붾㈃ 醫뚰몴(px) ??3D ?붾뱶 醫뚰몴 留ㅽ븨 */
var _3dScaleX = 1, _3dScaleZ = 1;
function to3D(px2d, py2d) {
  var w = window.innerWidth, h = window.innerHeight - SIM_TOP - SIM_BOTTOM;
  _3dScaleX = 1200 / w; _3dScaleZ = 1200 / h;
  return { x: (px2d - w / 2) * _3dScaleX, z: (py2d - h / 2) * _3dScaleZ };
}
function _groundUvFromWorld(x, z) {
  return {
    u: (x + 600) / 1200,
    v: (z + 600) / 1200
  };
}
function _worldFromGroundUv(u, v) {
  return {
    x: u * 1200 - 600,
    z: v * 1200 - 600
  };
}
function _getBuildClustersForCity(cityId) {
  if (cityId === 'telaviv') {
    return [
      { u: 0.66, v: 0.28, du: 0.12, dv: 0.14 },
      { u: 0.64, v: 0.50, du: 0.14, dv: 0.16 },
      { u: 0.68, v: 0.73, du: 0.12, dv: 0.14 }
    ];
  }
  if (cityId === 'haifa') {
    return [
      { u: 0.80, v: 0.22, du: 0.08, dv: 0.10 },
      { u: 0.76, v: 0.44, du: 0.10, dv: 0.12 },
      { u: 0.72, v: 0.70, du: 0.10, dv: 0.12 }
    ];
  }
  if (cityId === 'ashkelon') {
    return [
      { u: 0.64, v: 0.26, du: 0.12, dv: 0.12 },
      { u: 0.62, v: 0.50, du: 0.12, dv: 0.14 },
      { u: 0.66, v: 0.76, du: 0.10, dv: 0.12 }
    ];
  }
  if (cityId === 'sderot') {
    return [
      { u: 0.52, v: 0.34, du: 0.14, dv: 0.12 },
      { u: 0.56, v: 0.58, du: 0.14, dv: 0.14 }
    ];
  }
  if (cityId === 'jerusalem') {
    return [
      { u: 0.52, v: 0.34, du: 0.16, dv: 0.14 },
      { u: 0.48, v: 0.58, du: 0.14, dv: 0.14 },
      { u: 0.60, v: 0.66, du: 0.12, dv: 0.12 }
    ];
  }
  return null;
}
function _isLandPointForCity(cityId, x, z) {
  var uv = _groundUvFromWorld(x, z);
  var u = uv.u, v = uv.v;
  if (u < 0.06 || u > 0.95 || v < 0.05 || v > 0.95) return false;

  var coastMask = null;
  if (cityId === 'telaviv') {
    coastMask = [
      { x: 0.50, y: 0.04 },
      { x: 0.95, y: 0.04 },
      { x: 0.95, y: 0.96 },
      { x: 0.44, y: 0.96 },
      { x: 0.44, y: 0.80 },
      { x: 0.46, y: 0.63 },
      { x: 0.48, y: 0.44 },
      { x: 0.49, y: 0.24 },
      { x: 0.48, y: 0.10 }
    ];
  } else if (cityId === 'haifa') {
    coastMask = [
      { x: 0.83, y: 0.05 },
      { x: 0.95, y: 0.05 },
      { x: 0.95, y: 0.96 },
      { x: 0.64, y: 0.96 },
      { x: 0.63, y: 0.80 },
      { x: 0.67, y: 0.62 },
      { x: 0.74, y: 0.46 },
      { x: 0.80, y: 0.24 },
      { x: 0.82, y: 0.10 }
    ];
  } else if (cityId === 'ashkelon') {
    coastMask = [
      { x: 0.48, y: 0.04 },
      { x: 0.95, y: 0.04 },
      { x: 0.95, y: 0.96 },
      { x: 0.42, y: 0.96 },
      { x: 0.40, y: 0.74 },
      { x: 0.44, y: 0.48 },
      { x: 0.46, y: 0.22 }
    ];
  }
  if (coastMask) return pointInPolygon(u, v, coastMask);
  return true;
}
function _getBuildingSampleRangeForCity(cityId) {
  if (cityId === 'telaviv') return 980;
  if (cityId === 'ashkelon') return 920;
  if (cityId === 'jerusalem') return 900;
  if (cityId === 'sderot') return 760;
  return 840;
}
function _getBuildingClusterSpreadForCity(cityId) {
  if (cityId === 'sderot') return 1.15;
  if (cityId === 'jerusalem') return 1.35;
  return 1.5;
}
function _getBuildingMinSpacingForCity(cityId) {
  if (cityId === 'telaviv') return 28;
  if (cityId === 'ashkelon') return 26;
  if (cityId === 'jerusalem') return 26;
  if (cityId === 'sderot') return 30;
  return 24;
}
function _isBuildingPointAvailable(point, placed, minSpacing) {
  if (!placed || !placed.length || minSpacing <= 0) return true;
  var minDistSq = minSpacing * minSpacing;
  for (var pi = 0; pi < placed.length; pi++) {
    var dx = point.x - placed[pi].x;
    var dz = point.z - placed[pi].z;
    if (dx * dx + dz * dz < minDistSq) return false;
  }
  return true;
}
function _pickBuildingPointForCity(cityId, placed, minSpacing) {
  var clusters = _getBuildClustersForCity(cityId);
  var spread = _getBuildingClusterSpreadForCity(cityId);
  if (clusters && clusters.length > 0) {
    for (var attempt = 0; attempt < 180; attempt++) {
      var cluster = clusters[Math.floor(Math.random() * clusters.length)];
      var cu = cluster.u + (Math.random() - 0.5) * cluster.du * spread;
      var cv = cluster.v + (Math.random() - 0.5) * cluster.dv * spread;
      var clusterPoint = _worldFromGroundUv(cu, cv);
      if (_isLandPointForCity(cityId, clusterPoint.x, clusterPoint.z) && _isBuildingPointAvailable(clusterPoint, placed, minSpacing)) return clusterPoint;
    }
  }
  var sampleRange = _getBuildingSampleRangeForCity(cityId);
  for (var fallback = 0; fallback < 160; fallback++) {
    var bx = (Math.random() - 0.5) * sampleRange;
    var bz = (Math.random() - 0.5) * sampleRange;
    var fallbackPoint = { x: bx, z: bz };
    if (_isLandPointForCity(cityId, bx, bz) && _isBuildingPointAvailable(fallbackPoint, placed, minSpacing)) return fallbackPoint;
  }
  return null;
}
function _addCityBuildings(scene, cityId, count, footprintScale, heightScale) {
  if (cityId === 'haifa') return;
  // ?ㅻ뜲濡? ?띿큿 ?뚮룄????嫄대Ъ ?곴퀬 ??쓬
  var isSderot = cityId === 'sderot';
  var total = isSderot ? 35 : (count || 140);
  var fpScale = isSderot ? 0.7 : (footprintScale || 1);
  var htScale = isSderot ? 0.25 : (heightScale || 1);
  var minSpacing = _getBuildingMinSpacingForCity(cityId) * fpScale;
  var placed = [];
  for (var bi = 0; bi < total; bi++) {
    var pos = _pickBuildingPointForCity(cityId, placed, minSpacing);
    if (!pos) continue;
    placed.push(pos);
    var centerBias = 1 - Math.min(0.78, Math.sqrt(pos.x * pos.x + pos.z * pos.z) / 860);
    var bw, bd, bh;
    if (isSderot) {
      // ?띿큿 嫄대Ъ: ??퀬 ?볦쟻??1-2痢?二쇳깮
      bw = (8 + Math.random() * 10) * fpScale;
      bd = (8 + Math.random() * 10) * fpScale;
      bh = (4 + Math.random() * 6) * htScale; // 理쒕? 2.5m ?섏?
    } else {
      bw = (6 + Math.random() * 12) * fpScale;
      bd = (6 + Math.random() * 12) * fpScale;
      bh = (10 + Math.random() * (26 + centerBias * 22)) * htScale;
      if (Math.random() < 0.18) bh *= 1.55;
    }
    var bGeo = new THREE.BoxGeometry(bw, bh, bd);
    var buildColor = isSderot ? 0x8a9070 : 0x5b6f62;
    var buildEmissive = isSderot ? 0x4a5040 : 0x27352c;
    var bMat = new THREE.MeshPhongMaterial({
      color: buildColor,
      emissive: buildEmissive,
      shininess: 22,
      transparent: true,
      opacity: 0.92
    });
    var bMesh = new THREE.Mesh(bGeo, bMat);
    bMesh.position.set(pos.x, bh / 2, pos.z);
    scene.add(bMesh);
  }
}

function initThreeScene(container, cityId) {
  if (_threeInitialized) return;
  _threeInitialized = true;

  var w = window.innerWidth, h = window.innerHeight - SIM_TOP - SIM_BOTTOM;
  var scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x0a1208, 0.0003);

  var camera = new THREE.PerspectiveCamera(56, w / h, 1, 5000);
  camera.position.set(0, 320, 560);
  camera.lookAt(0, 45, 0);

  var renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
  renderer.setSize(w, h);
  renderer.setPixelRatio(window.devicePixelRatio || 1);
  renderer.setClearColor(0x080c08);
  container.appendChild(renderer.domElement);

  // 諛붾떏 ???꾩꽦 ?대?吏 ?띿뒪泥?
  var groundGeo = new THREE.PlaneGeometry(1200, 1200);
  var groundMat;
  var simCity = getDefenseCityById(cityId);
  var cachedTex = simCity ? _cityTexCache[simCity.id] : null;
  if (cachedTex) {
    cachedTex.anisotropy = renderer.capabilities.getMaxAnisotropy();
    groundMat = new THREE.MeshBasicMaterial({ map: cachedTex });
  } else {
    var loader = new THREE.TextureLoader();
    groundMat = new THREE.MeshBasicMaterial({ color: 0x1a2a1a });
    loader.load(buildSatUrl(1024, 1024, cityId), function(tex) { tex.anisotropy = renderer.capabilities.getMaxAnisotropy(); groundMat.map = tex; groundMat.needsUpdate = true; });
  }
  var ground = new THREE.Mesh(groundGeo, groundMat);
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -0.5;
  scene.add(ground);

  // 洹몃━???ㅻ쾭?덉씠
  var grid = new THREE.GridHelper(1200, 40, 0x00ff41, 0x0a2a0a);
  grid.material.transparent = true; grid.material.opacity = 0.15;
  scene.add(grid);

  // ?꾩떆 嫄대Ъ?????≪? ?곸뿭?먮쭔 諛곗튂
  _addCityBuildings(scene, cityId, 180, 1, 1);

  // 議곕챸
  scene.add(new THREE.AmbientLight(0xffffff, 1.2));
  var dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
  dirLight.position.set(200, 500, 200);
  scene.add(dirLight);

  // 蹂?
  var starGeo = new THREE.BufferGeometry();
  var sv = [];
  for (var si = 0; si < 400; si++) sv.push((Math.random()-0.5)*4000, 600+Math.random()*1500, (Math.random()-0.5)*4000);
  starGeo.setAttribute('position', new THREE.Float32BufferAttribute(sv, 3));
  scene.add(new THREE.Points(starGeo, new THREE.PointsMaterial({ color: 0x88aa88, size: 2 })));

  _threeScene = scene;
  _threeRenderer = renderer;
  _threeCamera = camera;

  // ?좊땲硫붿씠????移대찓???먮룞 ?뚯쟾 + ??컻 ?낅뜲?댄듃
  var camAngle = 0;
  function animate() {
    _threeAnimId = requestAnimationFrame(animate);
    camAngle += 0.0015;
    _threeCamera.position.x = 560 * Math.sin(camAngle);
    _threeCamera.position.z = 560 * Math.cos(camAngle);
    _threeCamera.position.y = 300 + 35 * Math.sin(camAngle * 2);
    _threeCamera.lookAt(0, 50, 0);

    // ??컻 ?뚰떚???낅뜲?댄듃
    for (var ei = _3dExplosions.length - 1; ei >= 0; ei--) {
      var ex = _3dExplosions[ei];
      ex.life -= 0.015;
      if (ex.life <= 0) {
        scene.remove(ex.mesh);
        _3dExplosions.splice(ei, 1);
      } else {
        ex.mesh.scale.multiplyScalar(1.05);
        ex.mesh.material.opacity = ex.life;
      }
    }


    renderer.render(scene, camera);
  }
  animate();
}

/** 2D 誘몄궗???곗씠?곕? 3D???숆린??*/
function syncThreeMissiles(missiles2d) {
  if (!_threeScene) return;
  var seen = {};
  for (var i = 0; i < missiles2d.length; i++) {
    var m = missiles2d[i];
    seen[m.id] = true;
    if (_3dMissileMap[m.id]) {
      // 湲곗〈 誘몄궗???꾩튂 ?낅뜲?댄듃
      var obj = _3dMissileMap[m.id];
      var p3 = to3D(m.x, m.y);
      // 誘몄궗?쇱? 怨좊룄瑜??쒓컙???곕씪 ?대젮?ㅻ뒗 寃껋쿂???쒗쁽
      var progress = 1; // 湲곕낯
      if (m.active && !m.intercepted) {
        var tdx = m.targetX - m.x, tdy = m.targetY - m.y;
        var tDist = Math.sqrt(tdx*tdx + tdy*tdy);
        progress = Math.min(1, tDist / 400);
        obj.mesh.position.set(p3.x, 20 + progress * 500, p3.z);
      }
      if (m.intercepted && !obj.exploded) {
        obj.exploded = true;
        // ??컻 ??珥덈줉??(?붽꺽 ?깃났)
        spawn3dExplosion(obj.mesh.position.clone(), true);
        _threeScene.remove(obj.mesh);
        if (obj.trail) _threeScene.remove(obj.trail);
      }
      if (!m.active && !m.intercepted && !obj.exploded) {
        obj.exploded = true;
        // ?꾩갑 ??鍮④컙????컻 (breach)
        var bp = to3D(m.targetX, m.targetY);
        spawn3dExplosion(new THREE.Vector3(bp.x, 5, bp.z), false);
        _threeScene.remove(obj.mesh);
        if (obj.trail) _threeScene.remove(obj.trail);
      }
    } else if (m.active) {
      // ??誘몄궗???앹꽦
      var startPos = to3D(m.x, m.y);
      var mGeo = new THREE.SphereGeometry(3, 6, 6);
      var mMat = new THREE.MeshBasicMaterial({ color: 0xff4444 });
      var mMesh = new THREE.Mesh(mGeo, mMat);
      mMesh.position.set(startPos.x, 520, startPos.z);
      _threeScene.add(mMesh);

      // 沅ㅼ쟻 ???寃잕퉴吏 媛?대뱶 ?쇱씤
      var tgtPos = to3D(m.targetX, m.targetY);
      var trGeo = new THREE.BufferGeometry();
      trGeo.setAttribute('position', new THREE.Float32BufferAttribute([
        startPos.x, 520, startPos.z, tgtPos.x, 5, tgtPos.z
      ], 3));
      var trMat = new THREE.LineBasicMaterial({ color: 0xff4444, transparent: true, opacity: 0.2 });
      var trail = new THREE.Line(trGeo, trMat);
      _threeScene.add(trail);

      _3dMissileMap[m.id] = { mesh: mMesh, trail: trail, exploded: false };

      // ?붽꺽 誘몄궗?쇰룄 ?앹꽦 (?덉씠??議댁씠 ?덉쑝硫?
      if (_radarZones.length > 0) {
        var iGeo = new THREE.SphereGeometry(2, 6, 6);
        var iMat = new THREE.MeshBasicMaterial({ color: 0x00ff41 });
        var iMesh = new THREE.Mesh(iGeo, iMat);
        var zc = to3D(_radarZones[0].center.x, _radarZones[0].center.y);
        iMesh.position.set(zc.x, 5, zc.z);
        _threeScene.add(iMesh);
        // ?붽꺽 誘몄궗?쇱? 以묎컙 怨좊룄 履쎌쑝濡??ν븯寃?
        var igTrailGeo = new THREE.BufferGeometry();
        igTrailGeo.setAttribute('position', new THREE.Float32BufferAttribute([
          zc.x, 5, zc.z, (startPos.x+tgtPos.x)/2, 250, (startPos.z+tgtPos.z)/2
        ], 3));
        var igTrail = new THREE.Line(igTrailGeo, new THREE.LineBasicMaterial({ color: 0x00ff41, transparent: true, opacity: 0.2 }));
        _threeScene.add(igTrail);
      }
    }
  }
  // ?щ씪吏?誘몄궗???뺣━
  var ids = Object.keys(_3dMissileMap);
  for (var k = 0; k < ids.length; k++) {
    if (!seen[ids[k]]) {
      var old = _3dMissileMap[ids[k]];
      if (old.mesh.parent) _threeScene.remove(old.mesh);
      if (old.trail && old.trail.parent) _threeScene.remove(old.trail);
      delete _3dMissileMap[ids[k]];
    }
  }
}

/** 2D ?덉씠??議???3D ???숆린??*/
function syncThreeZones(zones2d) {
  if (!_threeScene) return;
  var seen = {};

  function _zoneColor(capacity) {
    var capPct = (capacity || 0) / 5000;
    return capPct > 0.5 ? 0x00ff41 : (capPct > 0.2 ? 0xff9100 : 0xff4444);
  }

  function _buildFootprint(zone) {
    if (!zone || !zone.points || zone.points.length < 3) return null;
    var center3d = to3D(zone.center.x, zone.center.y);
    var shape = new THREE.Shape();
    var linePoints = [];
    var minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
    for (var pi = 0; pi < zone.points.length; pi++) {
      var wp = to3D(zone.points[pi].x, zone.points[pi].y);
      var localX = wp.x - center3d.x;
      var localY = -(wp.z - center3d.z);
      if (pi === 0) shape.moveTo(localX, localY);
      else shape.lineTo(localX, localY);
      linePoints.push(new THREE.Vector3(wp.x, 0.5, wp.z));
      if (wp.x < minX) minX = wp.x;
      if (wp.x > maxX) maxX = wp.x;
      if (wp.z < minZ) minZ = wp.z;
      if (wp.z > maxZ) maxZ = wp.z;
    }
    shape.closePath();
    linePoints.push(linePoints[0].clone());
    return {
      center3d: center3d,
      shape: shape,
      linePoints: linePoints,
      spanX: Math.max(24, maxX - minX),
      spanZ: Math.max(24, maxZ - minZ)
    };
  }

  function _createExtrudeVisual(zone, footprint, zoneColor) {
    var height = zone.height || 180;
    var extGeo = new THREE.ExtrudeGeometry(footprint.shape, { depth: height, bevelEnabled: false });
    var pillarMat = new THREE.MeshBasicMaterial({ color: zoneColor, transparent: true, opacity: 0.08, side: THREE.DoubleSide });
    var pillar = new THREE.Mesh(extGeo, pillarMat);
    pillar.rotation.x = -Math.PI / 2;
    pillar.position.set(footprint.center3d.x, 0, footprint.center3d.z);
    _threeScene.add(pillar);

    var wireMat = new THREE.MeshBasicMaterial({ color: zoneColor, wireframe: true, transparent: true, opacity: 0.3 });
    var wire = new THREE.Mesh(extGeo.clone(), wireMat);
    wire.rotation.x = -Math.PI / 2;
    wire.position.set(footprint.center3d.x, 0, footprint.center3d.z);
    _threeScene.add(wire);

    var topGeo = new THREE.ShapeGeometry(footprint.shape);
    var topMat = new THREE.MeshBasicMaterial({ color: zoneColor, transparent: true, opacity: 0.12, side: THREE.DoubleSide });
    var top = new THREE.Mesh(topGeo, topMat);
    top.rotation.x = -Math.PI / 2;
    top.position.set(footprint.center3d.x, height, footprint.center3d.z);
    _threeScene.add(top);

    var edgeGeo = new THREE.BufferGeometry().setFromPoints(footprint.linePoints);
    var edgeMat = new THREE.LineBasicMaterial({ color: zoneColor, transparent: true, opacity: 0.6 });
    var edge = new THREE.Line(edgeGeo, edgeMat);
    _threeScene.add(edge);

    return { parts: [pillar, wire, top, edge], materials: [pillarMat, wireMat, topMat, edgeMat] };
  }

  function _createDomeVisual(zone, footprint, zoneColor) {
    var maxSpan = Math.max(footprint.spanX, footprint.spanZ);
    var height = Math.min(zone.height || maxSpan * 0.62, maxSpan * 0.72);
    var domeGeo = new THREE.SphereGeometry(1, 28, 18, 0, Math.PI * 2, 0, Math.PI / 2);
    var domeMat = new THREE.MeshBasicMaterial({ color: zoneColor, transparent: true, opacity: 0.12, side: THREE.DoubleSide });
    var dome = new THREE.Mesh(domeGeo, domeMat);
    dome.scale.set(footprint.spanX / 2, height, footprint.spanZ / 2);
    dome.position.set(footprint.center3d.x, 0, footprint.center3d.z);
    _threeScene.add(dome);

    var wireMat = new THREE.MeshBasicMaterial({ color: zoneColor, wireframe: true, transparent: true, opacity: 0.28 });
    var wire = new THREE.Mesh(domeGeo.clone(), wireMat);
    wire.scale.copy(dome.scale);
    wire.position.copy(dome.position);
    _threeScene.add(wire);

    var baseGeo = new THREE.ShapeGeometry(footprint.shape);
    var baseMat = new THREE.MeshBasicMaterial({ color: zoneColor, transparent: true, opacity: 0.08, side: THREE.DoubleSide });
    var base = new THREE.Mesh(baseGeo, baseMat);
    base.rotation.x = -Math.PI / 2;
    base.position.set(footprint.center3d.x, 0.8, footprint.center3d.z);
    _threeScene.add(base);

    var edgeGeo = new THREE.BufferGeometry().setFromPoints(footprint.linePoints);
    var edgeMat = new THREE.LineBasicMaterial({ color: zoneColor, transparent: true, opacity: 0.58 });
    var edge = new THREE.Line(edgeGeo, edgeMat);
    _threeScene.add(edge);

    return { parts: [dome, wire, base, edge], materials: [domeMat, wireMat, baseMat, edgeMat] };
  }

  for (var i = 0; i < zones2d.length; i++) {
    var z = zones2d[i];
    seen[z.id] = true;
    if (!_3dZoneMap[z.id]) {
      var footprint = _buildFootprint(z);
      if (!footprint) continue;
      var mode = z.renderMode || 'extrude';
      var zoneColor = _zoneColor(z.capacity || 5000);
      _3dZoneMap[z.id] = mode === 'dome'
        ? _createDomeVisual(z, footprint, zoneColor)
        : _createExtrudeVisual(z, footprint, zoneColor);
    }
    var zObj = _3dZoneMap[z.id];
    if (!zObj || !zObj.materials) continue;
    var hx = _zoneColor(z.capacity || 5000);
    for (var mi = 0; mi < zObj.materials.length; mi++) zObj.materials[mi].color.setHex(hx);
  }

  var zids = Object.keys(_3dZoneMap);
  for (var ki = 0; ki < zids.length; ki++) {
    if (!seen[zids[ki]]) {
      var old = _3dZoneMap[zids[ki]];
      if (old && old.parts) {
        for (var pi = 0; pi < old.parts.length; pi++) _threeScene.remove(old.parts[pi]);
      }
      delete _3dZoneMap[zids[ki]];
    }
  }
}

function spawn3dExplosion(pos, isIntercept) {
  if (!_threeScene) return;
  var color = isIntercept ? 0x00ff41 : 0xff4444;
  var geo = new THREE.SphereGeometry(10, 12, 12);
  var mat = new THREE.MeshBasicMaterial({ color: color, transparent: true, opacity: 1 });
  var mesh = new THREE.Mesh(geo, mat);
  mesh.position.copy(pos);
  _threeScene.add(mesh);
  _3dExplosions.push({ mesh: mesh, life: 1.0 });
}

function remove3dBreachMarker(marker) {
  if (!_threeScene || !marker) return;
  if (marker.mesh) _threeScene.remove(marker.mesh);
  if (marker.ring) _threeScene.remove(marker.ring);
}

function create3dBreachMarker(breach2d) {
  if (!_threeScene) return null;
  var bp = to3D(breach2d.x, breach2d.y);
  // 肄??뺥깭 ??遺덈궃 ?먮굦
  var coneGeo = new THREE.ConeGeometry(10, 35, 6);
  var coneMat = new THREE.MeshBasicMaterial({ color: 0xff4444, transparent: true, opacity: 0.85 });
  var cone = new THREE.Mesh(coneGeo, coneMat);
  cone.position.set(bp.x, 18, bp.z);
  _threeScene.add(cone);
  // 鍮쏅굹??諛붾떏 留?
  var ringGeo = new THREE.RingGeometry(8, 16, 16);
  var ringMat = new THREE.MeshBasicMaterial({ color: 0xff6622, transparent: true, opacity: 0.5, side: THREE.DoubleSide });
  var ring = new THREE.Mesh(ringGeo, ringMat);
  ring.rotation.x = -Math.PI / 2;
  ring.position.set(bp.x, 1, bp.z);
  _threeScene.add(ring);
  return { mesh: cone, ring: ring };
}

/** 2D breaches 諛곗뿴 ??3D ?곴뎄 留덉빱 ?숆린??*/
function syncThreeBreaches(breaches2d) {
  if (!_threeScene) return;
  while (_3dBreachMarkers.length > breaches2d.length) {
    remove3dBreachMarker(_3dBreachMarkers.pop());
  }
  for (var i = 0; i < breaches2d.length; i++) {
    var b = breaches2d[i];
    if (!_3dBreachMarkers[i]) {
      _3dBreachMarkers[i] = create3dBreachMarker(b);
      continue;
    }
    var bp = to3D(b.x, b.y);
    _3dBreachMarkers[i].mesh.position.set(bp.x, 18, bp.z);
    if (_3dBreachMarkers[i].ring) _3dBreachMarkers[i].ring.position.set(bp.x, 1, bp.z);
  }
}

function destroyThreeScene() {
  if (_threeAnimId) cancelAnimationFrame(_threeAnimId);
  for (var i = 0; i < _3dBreachMarkers.length; i++) remove3dBreachMarker(_3dBreachMarkers[i]);
  _3dMissileMap = {}; _3dZoneMap = {}; _3dExplosions = []; _3dBreachMarkers = [];
  if (_threeRenderer) {
    _threeRenderer.dispose();
    if (_threeRenderer.domElement && _threeRenderer.domElement.parentNode)
      _threeRenderer.domElement.parentNode.removeChild(_threeRenderer.domElement);
  }
  _threeScene = null; _threeRenderer = null; _threeCamera = null;
  _threeInitialized = false;
}

// ?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧
// MULTI-3D: Per-city Three.js scenes
// ?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧
function initMulti3dScene(cityId, container, zones2d) {
  if (_multi3dScenes[cityId]) return;
  var city = null;
  for (var i = 0; i < DEFENSE_CITIES.length; i++) {
    if (DEFENSE_CITIES[i].id === cityId) { city = DEFENSE_CITIES[i]; break; }
  }
  if (!city) return;
  var w = container.clientWidth, h = container.clientHeight;
  if (w < 10 || h < 10) return;

  var scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x080c08, 0.0004);

  var camera = new THREE.PerspectiveCamera(52, w / h, 1, 10000);
  camera.position.set(0, 520, 620);
  camera.lookAt(0, 100, 0);
  var _camBaseY = 520, _camBaseR = 620, _camLookY = 100;
  var _camTargetY = _camBaseY, _camTargetR = _camBaseR, _camTargetLookY = _camLookY;

  var renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
  renderer.setSize(w, h);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setClearColor(0x080c08);
  container.appendChild(renderer.domElement);

  // 議곕챸
  var ambLight = new THREE.AmbientLight(0xffffff, 0.6);
  scene.add(ambLight);
  var dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
  dirLight.position.set(200, 400, 200);
  scene.add(dirLight);

  // ?꾩꽦 諛붾떏 ???꾨━濡쒕뱶 罹먯떆 ?곗꽑 ?ъ슜
  var groundGeo = new THREE.PlaneGeometry(1200, 1200);
  var cachedTex = _cityTexCache[cityId];
  var groundMat;
  if (cachedTex) {
    groundMat = new THREE.MeshLambertMaterial({ map: cachedTex });
  } else {
    groundMat = new THREE.MeshLambertMaterial({ color: 0x1a331a });
    var dpr = Math.min(window.devicePixelRatio, 2);
    var satUrl = 'https://services.arcgisonline.com/arcgis/rest/services/World_Imagery/MapServer/export'
      + '?bbox=' + city.bbox + '&bboxSR=4326&size=' + Math.round(w * dpr) + ',' + Math.round(h * dpr)
      + '&imageSR=4326&format=jpg&f=image';
    var loader = new THREE.TextureLoader();
    loader.load(satUrl, function(tex) {
      _cityTexCache[cityId] = tex;
      groundMat.map = tex;
      groundMat.color.set(0xffffff);
      groundMat.needsUpdate = true;
    });
  }
  var ground = new THREE.Mesh(groundGeo, groundMat);
  ground.rotation.x = -Math.PI / 2;
  scene.add(ground);

  _addCityBuildings(scene, cityId, 110, 0.9, 0.92);

  // ?? ?꾩떆蹂?2D 諛⑷났 援ъ뿭??洹몃?濡?3D濡??몄? ??
  var zoneSource = zones2d || [];
  var zoneData = [];
  var ZONE_HEIGHT = 180;

  function _zoneColor(capacity) {
    var capPct = (capacity || 0) / 5000;
    return capPct > 0.5 ? 0x00ff41 : (capPct > 0.2 ? 0xff9100 : 0xff4444);
  }

  function _addExtrudedZone(zone) {
    if (!zone || !zone.points || zone.points.length < 3) return;
    var center3d = to3D(zone.center.x, zone.center.y);
    var shape = new THREE.Shape();
    var worldPoly = [];
    var linePoints = [];
    var minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;

    for (var pi = 0; pi < zone.points.length; pi++) {
      var wp = to3D(zone.points[pi].x, zone.points[pi].y);
      var localX = wp.x - center3d.x;
      var localY = -(wp.z - center3d.z);
      if (pi === 0) shape.moveTo(localX, localY);
      else shape.lineTo(localX, localY);
      worldPoly.push({ x: wp.x, y: wp.z });
      linePoints.push(new THREE.Vector3(wp.x, 0.5, wp.z));
      if (wp.x < minX) minX = wp.x;
      if (wp.x > maxX) maxX = wp.x;
      if (wp.z < minZ) minZ = wp.z;
      if (wp.z > maxZ) maxZ = wp.z;
    }
    if (linePoints.length === 0) return;
    linePoints.push(linePoints[0].clone());
    shape.closePath();

    var zoneColor = _zoneColor(zone.capacity || 5000);
    var mode = zone.renderMode || 'extrude';

    if (mode === 'dome') {
      var maxSpan = Math.max(maxX - minX, maxZ - minZ);
      var domeHeight = Math.min(zone.height || maxSpan * 0.62, maxSpan * 0.72);
      var domeGeo = new THREE.SphereGeometry(1, 28, 18, 0, Math.PI * 2, 0, Math.PI / 2);
      var domeMat = new THREE.MeshBasicMaterial({ color: zoneColor, transparent: true, opacity: 0.12, side: THREE.DoubleSide });
      var dome = new THREE.Mesh(domeGeo, domeMat);
      dome.scale.set(Math.max(18, (maxX - minX) / 2), domeHeight, Math.max(18, (maxZ - minZ) / 2));
      dome.position.set(center3d.x, 0, center3d.z);
      scene.add(dome);

      var domeWireMat = new THREE.MeshBasicMaterial({ color: zoneColor, wireframe: true, transparent: true, opacity: 0.28 });
      var domeWire = new THREE.Mesh(domeGeo.clone(), domeWireMat);
      domeWire.scale.copy(dome.scale);
      domeWire.position.copy(dome.position);
      scene.add(domeWire);

      var baseGeo = new THREE.ShapeGeometry(shape);
      var baseMat = new THREE.MeshBasicMaterial({ color: zoneColor, transparent: true, opacity: 0.08, side: THREE.DoubleSide });
      var base = new THREE.Mesh(baseGeo, baseMat);
      base.rotation.x = -Math.PI / 2;
      base.position.set(center3d.x, 0.8, center3d.z);
      scene.add(base);
    } else {
      var height = zone.height || ZONE_HEIGHT;
      var extGeo = new THREE.ExtrudeGeometry(shape, { depth: height, bevelEnabled: false });
      var pillarMat = new THREE.MeshBasicMaterial({ color: zoneColor, transparent: true, opacity: 0.08, side: THREE.DoubleSide });
      var pillar = new THREE.Mesh(extGeo, pillarMat);
      pillar.rotation.x = -Math.PI / 2;
      pillar.position.set(center3d.x, 0, center3d.z);
      scene.add(pillar);

      var wireMat = new THREE.MeshBasicMaterial({ color: zoneColor, wireframe: true, transparent: true, opacity: 0.32 });
      var wire = new THREE.Mesh(extGeo.clone(), wireMat);
      wire.rotation.x = -Math.PI / 2;
      wire.position.set(center3d.x, 0, center3d.z);
      scene.add(wire);

      var topGeo = new THREE.ShapeGeometry(shape);
      var topMat = new THREE.MeshBasicMaterial({ color: zoneColor, transparent: true, opacity: 0.12, side: THREE.DoubleSide });
      var top = new THREE.Mesh(topGeo, topMat);
      top.rotation.x = -Math.PI / 2;
      top.position.set(center3d.x, height, center3d.z);
      scene.add(top);
    }

    var edgeGeo = new THREE.BufferGeometry().setFromPoints(linePoints);
    var edgeMat = new THREE.LineBasicMaterial({ color: zoneColor, transparent: true, opacity: 0.55 });
    var edge = new THREE.Line(edgeGeo, edgeMat);
    scene.add(edge);

    zoneData.push({
      id: zone.id,
      cx: center3d.x,
      cz: center3d.z,
      poly: worldPoly,
      bounds: { minX: minX, maxX: maxX, minZ: minZ, maxZ: maxZ },
      cap: zone.capacity || 5000
    });
  }

  function _pickPointInsideZone(zone) {
    var spanX = Math.max(1, zone.bounds.maxX - zone.bounds.minX);
    var spanZ = Math.max(1, zone.bounds.maxZ - zone.bounds.minZ);
    var insetX = Math.min(24, spanX * 0.12);
    var insetZ = Math.min(24, spanZ * 0.12);
    for (var attempt = 0; attempt < 36; attempt++) {
      var tx = randRange(zone.bounds.minX + insetX, zone.bounds.maxX - insetX);
      var tz = randRange(zone.bounds.minZ + insetZ, zone.bounds.maxZ - insetZ);
      if (pointInPolygon(tx, tz, zone.poly)) return { x: tx, z: tz };
    }
    return { x: zone.cx, z: zone.cz };
  }

  function _insideAnyZone(x, z) {
    for (var zi = 0; zi < zoneData.length; zi++) {
      if (pointInPolygon(x, z, zoneData[zi].poly)) return true;
    }
    return false;
  }

  for (var zi = 0; zi < zoneSource.length; zi++) _addExtrudedZone(zoneSource[zi]);

  // ?먥븧 Multi-3D ?꾩떆酉? ?쇰컲(Iron Dome) + 怨좉퀬???곕묠媛꾩젏) ?먥븧
  var cityMissiles = [];
  var ballisticMissiles3d = []; // 怨좉퀬???꾩슜
  var cityExplosions = [];
  var breachMarkers = [];
  var MISSILE_COUNT = 12;
  var initialLaunchAt = Date.now() + MULTI3D_LAUNCH_DELAY_MS;

  function _pickMissileTarget(mm) {
    if (zoneData.length > 0 && Math.random() < 0.7) {
      var zoneIdx = Math.floor(Math.random() * zoneData.length);
      var zone = zoneData[zoneIdx];
      var target = _pickPointInsideZone(zone);
      mm.tx = target.x; mm.tz = target.z; mm.hitsZone = true;
    } else {
      var safePoint = null;
      for (var attempt = 0; attempt < 40; attempt++) {
        var tx = (Math.random() - 0.5) * 500;
        var tz = (Math.random() - 0.5) * 500;
        if (!_insideAnyZone(tx, tz)) { safePoint = { x: tx, z: tz }; break; }
      }
      if (!safePoint) safePoint = { x: (Math.random() - 0.5) * 500, z: (Math.random() - 0.5) * 500 };
      mm.tx = safePoint.x; mm.tz = safePoint.z; mm.hitsZone = false;
    }
  }

  function _sampleInboundAngle(cityId) {
    var ranges;
    if (cityId === 'sderot' || cityId === 'ashkelon') {
      ranges = [[Math.PI * 0.78, Math.PI * 0.98], [Math.PI * 1.02, Math.PI * 1.18]];
    } else if (cityId === 'haifa') {
      ranges = [[-Math.PI * 0.68, -Math.PI * 0.48], [Math.PI * 0.82, Math.PI * 0.96]];
    } else if (cityId === 'jerusalem') {
      ranges = [[-0.22, 0.12], [-0.52, -0.28]];
    } else {
      ranges = [[Math.PI * 0.90, Math.PI * 1.08], [-0.42, -0.18]];
    }
    var band = ranges[Math.floor(Math.random() * ranges.length)];
    return randRange(band[0], band[1]);
  }

  function _pickSpawnForCity(cityId) {
    var spawnAngle = _sampleInboundAngle(cityId);
    var spawnR = 470 + Math.random() * 130;
    return {
      x: Math.cos(spawnAngle) * spawnR,
      y: 85 + Math.random() * 70,
      z: Math.sin(spawnAngle) * spawnR
    };
  }

  function _resetCityMissile(mm, delayed) {
    var spawn = _pickSpawnForCity(cityId);
    mm.sx = spawn.x;
    mm.sy = spawn.y;
    mm.sz = spawn.z;
    mm.x = mm.sx; mm.y = mm.sy; mm.z = mm.sz;

    _pickMissileTarget(mm);

    var dx = mm.tx - mm.x, dy = -mm.y, dz = mm.tz - mm.z;
    var dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
    mm.speed = computeTravelSpeed(dist, randRange(CITY_TERMINAL_SECONDS.min, CITY_TERMINAL_SECONDS.max));
    mm.pendingLaunch = !!delayed;
    mm.launchAt = delayed ? initialLaunchAt : 0;
    mm.alive = !delayed;
    mm.mesh.position.set(mm.x, mm.y, mm.z);
    mm.mesh.visible = !delayed;
    mm.mesh.material.color.setHex(0xff9100);
    mm.mesh.scale.set(1, 1, 1);
    if (mm.trail) { scene.remove(mm.trail); mm.trail = null; }
  }

  function _createMissileMesh(s) {
    var geo = new THREE.SphereGeometry(4, 6, 6);
    var mat = new THREE.MeshBasicMaterial({ color: 0xff9100 });
    var mesh = new THREE.Mesh(geo, mat);
    s.add(mesh);
    return mesh;
  }

  function _createExplosion(s, x, y, z, color, big) {
    var radius = big ? 18 : 8;
    var geo = new THREE.SphereGeometry(radius, 10, 10);
    var mat = new THREE.MeshBasicMaterial({ color: color, transparent: true, opacity: 1.0 });
    var mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(x, y, z);
    s.add(mesh);
    return { mesh: mesh, born: Date.now(), duration: big ? 1200 : 600 };
  }

  function _createBreachMarker(s, x, z) {
    var cGeo = new THREE.ConeGeometry(8, 25, 6);
    var cMat = new THREE.MeshBasicMaterial({ color: 0xff4444, transparent: true, opacity: 0.85 });
    var cone = new THREE.Mesh(cGeo, cMat);
    cone.position.set(x, 12, z);
    s.add(cone);
    var rGeo = new THREE.RingGeometry(6, 14, 16);
    var rMat = new THREE.MeshBasicMaterial({ color: 0xff6622, transparent: true, opacity: 0.4, side: THREE.DoubleSide });
    var ring = new THREE.Mesh(rGeo, rMat);
    ring.rotation.x = -Math.PI / 2; ring.position.set(x, 0.5, z);
    s.add(ring);
    return { cone: cone, ring: ring };
  }

  for (var mi = 0; mi < MISSILE_COUNT; mi++) {
    var missile = { mesh: _createMissileMesh(scene), trail: null };
    _resetCityMissile(missile, true);
    cityMissiles.push(missile);
  }

  // ?? 怨좉퀬???꾨룄誘몄궗??(??鍮④컙 援ъ껜, ?섏쭅 ?숉븯) ??
  function _createBallisticMesh3d(s) {
    var geo = new THREE.SphereGeometry(10, 10, 10);
    var mat = new THREE.MeshBasicMaterial({ color: 0xdd2222 });
    var mesh = new THREE.Mesh(geo, mat);
    // 湲濡쒖슦 留?
    var glowGeo = new THREE.RingGeometry(14, 22, 16);
    var glowMat = new THREE.MeshBasicMaterial({ color: 0xff4444, transparent: true, opacity: 0.3, side: THREE.DoubleSide });
    var glow = new THREE.Mesh(glowGeo, glowMat);
    mesh.add(glow);
    s.add(mesh);
    return mesh;
  }
  function _resetBallistic3d(bm, delayed) {
    var angle = Math.random() * Math.PI * 2;
    var r = 100 + Math.random() * 200;
    bm.tx = Math.cos(angle) * r;
    bm.tz = Math.sin(angle) * r;
    bm.x = bm.tx + (Math.random() - 0.5) * 80;
    bm.y = 1200 + Math.random() * 400;
    bm.z = bm.tz + (Math.random() - 0.5) * 80;
    bm.speed = 120 + Math.random() * 60;
    bm.pendingLaunch = !!delayed;
    bm.launchAt = delayed ? (initialLaunchAt + 1000 + Math.random() * 3000) : 0;
    bm.alive = !delayed;
    bm.mesh.position.set(bm.x, bm.y, bm.z);
    bm.mesh.visible = !delayed;
  }
  for (var bi = 0; bi < 3; bi++) {
    var bm = { mesh: _createBallisticMesh3d(scene) };
    _resetBallistic3d(bm, true);
    ballisticMissiles3d.push(bm);
  }

  var animId, lastFrameTs = 0;
  function animate(ts) {
    animId = requestAnimationFrame(animate);
    var now = Date.now();
    var dt = lastFrameTs ? Math.min(0.05, (ts - lastFrameTs) / 1000) : (1 / 60);
    lastFrameTs = ts;

    // ?? ?쇰컲 誘몄궗??(Iron Dome) ??
    for (var i = 0; i < cityMissiles.length; i++) {
      var m = cityMissiles[i];
      if (m.pendingLaunch) {
        if (now < m.launchAt) continue;
        m.pendingLaunch = false; m.alive = true;
        m.mesh.visible = true; m.mesh.position.set(m.x, m.y, m.z);
      }
      if (!m.alive) continue;

      var dx = m.tx - m.x, dy = -m.y, dz = m.tz - m.z;
      var dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
      var step = m.speed * dt;
      if (m.y <= 3 || dist < Math.max(15, step * 1.1)) {
        m.alive = false; m.mesh.visible = false;
        if (m.trail) { scene.remove(m.trail); m.trail = null; }
        var intercepted = false;
        for (var zci = 0; zci < zoneData.length; zci++) {
          if (zoneData[zci].cap > 0 && pointInPolygon(m.x, m.z, zoneData[zci].poly)) {
            intercepted = true; zoneData[zci].cap--;
            cityExplosions.push(_createExplosion(scene, m.x, Math.max(ZONE_HEIGHT * 0.7, m.y), m.z, 0x00ff41, false));
            break;
          }
        }
        if (!intercepted) {
          cityExplosions.push(_createExplosion(scene, m.x, Math.max(1, m.y), m.z, 0xff4444, false));
          breachMarkers.push(_createBreachMarker(scene, m.x, m.z));
        }
        (function(mm) { setTimeout(function() { _resetCityMissile(mm, false); }, 800 + Math.random() * 1500); })(m);
        continue;
      }

      m.x += (dx / dist) * step;
      m.y += (dy / dist) * step;
      m.z += (dz / dist) * step;
      m.mesh.position.set(m.x, m.y, m.z);
    }

    // ?? 怨좉퀬???꾨룄誘몄궗??(?섏쭅 ?숉븯, 諛⑷났援ъ뿭?먯꽌 ?붽꺽 ???????컻) ??
    for (var bi2 = 0; bi2 < ballisticMissiles3d.length; bi2++) {
      var bm2 = ballisticMissiles3d[bi2];
      if (bm2.pendingLaunch) {
        if (now < bm2.launchAt) continue;
        bm2.pendingLaunch = false; bm2.alive = true;
        bm2.mesh.visible = true;
      }
      if (!bm2.alive) continue;
      // 嫄곗쓽 ?섏쭅 ?숉븯
      bm2.y -= bm2.speed * dt;
      bm2.x += (bm2.tx - bm2.x) * 0.01;
      bm2.z += (bm2.tz - bm2.z) * 0.01;
      bm2.mesh.position.set(bm2.x, bm2.y, bm2.z);
      // 吏硫??꾨떖
      if (bm2.y <= 5) {
        bm2.alive = false; bm2.mesh.visible = false;
        var bInt = false;
        for (var zb = 0; zb < zoneData.length; zb++) {
          if (zoneData[zb].cap > 0 && pointInPolygon(bm2.x, bm2.z, zoneData[zb].poly)) {
            bInt = true; zoneData[zb].cap -= 3;
            cityExplosions.push(_createExplosion(scene, bm2.x, 300, bm2.z, 0xdd2222, true));
            break;
          }
        }
        if (!bInt) {
          cityExplosions.push(_createExplosion(scene, bm2.x, 5, bm2.z, 0xff2222, true));
          breachMarkers.push(_createBreachMarker(scene, bm2.x, bm2.z));
        }
        (function(bb) { setTimeout(function() { _resetBallistic3d(bb, false); }, 2000 + Math.random() * 3000); })(bm2);
      }
    }

    for (var ei = cityExplosions.length - 1; ei >= 0; ei--) {
      var ex = cityExplosions[ei];
      var age = now - ex.born;
      if (age > ex.duration) { scene.remove(ex.mesh); cityExplosions.splice(ei, 1); continue; }
      var t = age / ex.duration;
      var sc2 = 1 + t * (ex.duration > 800 ? 6 : 3);
      ex.mesh.scale.set(sc2, sc2, sc2);
      ex.mesh.material.opacity = 1 - t;
    }

    var ct = now * 0.00008;
    camera.position.x = Math.sin(ct) * _camBaseR;
    camera.position.y = _camBaseY;
    camera.position.z = Math.cos(ct) * _camBaseR;
    camera.lookAt(0, _camLookY, 0);
    renderer.render(scene, camera);
  }
  animId = requestAnimationFrame(animate);

  _multi3dScenes[cityId] = {
    scene: scene,
    renderer: renderer,
    camera: camera,
    animId: animId,
    missiles: cityMissiles,
    explosions: cityExplosions,
    zoneSignature: buildZoneSignature(zoneSource)
  };
}

function destroyMulti3dScene(cityId) {
  var entry = _multi3dScenes[cityId];
  if (!entry) return;
  if (entry.animId) cancelAnimationFrame(entry.animId);
  if (entry.renderer) {
    entry.renderer.dispose();
    if (entry.renderer.domElement && entry.renderer.domElement.parentNode)
      entry.renderer.domElement.parentNode.removeChild(entry.renderer.domElement);
  }
  var flashes = document.querySelectorAll('.screen-flash');
  for (var fi = 0; fi < flashes.length; fi++) {
    if (flashes[fi].parentNode) flashes[fi].parentNode.removeChild(flashes[fi]);
  }
  delete _multi3dScenes[cityId];
}

// ?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧
// NATIONAL VIEW COMPONENT
// ?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧
function NationalView(props) {
  if (!props.visible) return createVNode('div', { class: 'national-view hidden' }, []);

  var w = window.innerWidth, h = window.innerHeight - SIM_TOP - SIM_BOTTOM;
  var bgStyle = 'background-image:url(' + getNationalSatUrl(w, h) + ')';

  // ?꾩떆 留덉빱 SVG
  var cityEls = [];
  var cityMeta = [];
  var CITY_LABEL_NUDGE_Y = {
    haifa: -34,
    telaviv: -10,
    jerusalem: 18,
    ashkelon: 22,
    sderot: 50
  };
  function computeHorizontalMid(entries, key) {
    if (!entries || entries.length === 0) return w / 2;
    var minX = Infinity, maxX = -Infinity;
    for (var i = 0; i < entries.length; i++) {
      var x = entries[i][key].x;
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
    }
    return (minX + maxX) / 2;
  }
  for (var ci = 0; ci < DEFENSE_CITIES.length; ci++) {
    var c = DEFENSE_CITIES[ci];
    var cp = geoToScreen(c.lon, c.lat, w, h);
    var isUnderAttack = false;
    for (var ai = 0; ai < props.natMissiles.length; ai++) {
      if (props.natMissiles[ai].targetCity === c.id && props.natMissiles[ai].active) { isUnderAttack = true; break; }
    }
    var ringColor = isUnderAttack ? '#f87171' : '#b8c8dc';
    cityMeta.push({
      city: c,
      cp: cp,
      isUnderAttack: isUnderAttack,
      ringColor: ringColor,
      dy: CITY_LABEL_NUDGE_Y[c.id] || -8,
      labelWidth: Math.max(116, c.name.length * 9 + 34)
    });
  }

  function layoutCityLabels(entries) {
    if (entries.length === 0) return;
    var boxH = 30;
    var minX = 12;
    var maxX = w - 12;
    var minY = 64;
    var maxY = h - 18;
    var gapX = 18;
    var midX = computeHorizontalMid(entries, 'cp');

    for (var li = 0; li < entries.length; li++) {
      var entry = entries[li];
      entry.side = entry.cp.x < midX ? 'left' : 'right';
      var rawX = entry.side === 'left'
        ? entry.cp.x - entry.labelWidth - gapX
        : entry.cp.x + gapX;
      var rawY = entry.cp.y + entry.dy - boxH / 2;
      entry.labelBox = {
        x: Math.max(minX, Math.min(maxX - entry.labelWidth, rawX)),
        y: Math.max(minY, Math.min(maxY - boxH, rawY)),
        w: entry.labelWidth,
        h: boxH
      };
    }

    entries.sort(function(a, b) { return a.labelBox.y - b.labelBox.y; });
    for (var fi = 1; fi < entries.length; fi++) {
      var prev = entries[fi - 1].labelBox;
      var cur = entries[fi].labelBox;
      if (cur.y < prev.y + prev.h + 8) cur.y = prev.y + prev.h + 8;
    }
    for (var bi = entries.length - 1; bi >= 0; bi--) {
      var box = entries[bi].labelBox;
      if (box.y + box.h > maxY) box.y = maxY - box.h;
      if (bi > 0) {
        var prevBox = entries[bi - 1].labelBox;
        if (prevBox.y + prevBox.h + 8 > box.y) prevBox.y = Math.max(minY, box.y - prevBox.h - 8);
      }
    }

    for (var ai = 0; ai < entries.length; ai++) {
      var item = entries[ai];
      var boxX = item.labelBox.x;
      var boxY = item.labelBox.y;
      var boxW = item.labelBox.w;
      var boxH2 = item.labelBox.h;
      var anchorX = item.side === 'left' ? boxX + boxW : boxX;
      var anchorY = Math.max(boxY + 7, Math.min(boxY + boxH2 - 7, item.cp.y));
      item.labelPoint = { x: anchorX, y: anchorY };
      item.textX = boxX + 12;
      item.textY = boxY + 20;
    }
  }

  layoutCityLabels(cityMeta);

  for (var ci = 0; ci < cityMeta.length; ci++) {
    var meta = cityMeta[ci];
    cityEls.push(createVNode('g', { class: 'city-marker', 'data-action': 'select-city-' + meta.city.id }, [
      createVNode('line', {
        x1: String(meta.cp.x), y1: String(meta.cp.y),
        x2: String(meta.labelPoint.x), y2: String(meta.labelPoint.y),
        class: 'city-label-link', stroke: meta.ringColor
      }, []),
      createVNode('circle', { cx: String(meta.cp.x), cy: String(meta.cp.y), r: meta.isUnderAttack ? '14' : '10', class: 'city-ring',
        fill: meta.ringColor, stroke: meta.ringColor, 'fill-opacity': meta.isUnderAttack ? '0.28' : '0.14' }, []),
      createVNode('circle', { cx: String(meta.cp.x), cy: String(meta.cp.y), r: '4', fill: meta.ringColor }, []),
      createVNode('rect', {
        x: String(meta.labelBox.x), y: String(meta.labelBox.y), width: String(meta.labelBox.w), height: String(meta.labelBox.h),
        rx: '8', ry: '8', class: 'city-label-box', stroke: meta.ringColor
      }, []),
      createVNode('circle', { cx: String(meta.labelPoint.x), cy: String(meta.labelPoint.y), r: '3.5', class: 'city-label-dot', fill: meta.ringColor }, []),
      createVNode('text', { x: String(meta.textX), y: String(meta.textY), class: 'city-label', 'text-anchor': 'start' }, [
        createTextVNode(meta.city.name)
      ])
    ]));
  }

  // ?꾪삊 異쒕컻吏 留덉빱
  var threatEls = [];
  var threatMeta = [];
  var THREAT_LABEL_NUDGE_Y = {
    gaza: -24,
    lebanon: -26,
    iran: -8,
    yemen: -26,
    syria: -36
  };
  var THREAT_LABEL_EXTRA_X = {
    gaza: 92
  };
  function getThreatLabelText(threat) {
    if (threat.id === 'lebanon') return 'South Lebanon';
    if (threat.id === 'syria') return 'Syria / Iraq';
    return threat.name;
  }
  for (var ti = 0; ti < THREAT_ORIGINS.length; ti++) {
    var t = THREAT_ORIGINS[ti];
    var tp = geoToScreen(t.lon, t.lat, w, h);
    tp.x = Math.max(30, Math.min(w - 30, tp.x));
    tp.y = Math.max(30, Math.min(h - 30, tp.y));
    var labelText = getThreatLabelText(t);
    threatMeta.push({
      threat: t,
      tp: tp,
      labelText: labelText,
      dy: THREAT_LABEL_NUDGE_Y[t.id] || -12,
      labelWidth: Math.max(102, labelText.length * 8 + 26)
    });
  }

  function layoutThreatLabels(entries) {
    if (entries.length === 0) return;
    var boxH = 26;
    var minX = 12;
    var maxX = w - 12;
    var minY = 18;
    var maxY = h - 18;
    var gapX = 18;
    var midX = computeHorizontalMid(entries, 'tp');

    for (var li = 0; li < entries.length; li++) {
      var entry = entries[li];
      entry.side = entry.tp.x < midX ? 'left' : 'right';
      var extraGapX = THREAT_LABEL_EXTRA_X[entry.threat.id] || 0;
      var totalGapX = gapX + extraGapX;
      var sideInset = entry.labelWidth + totalGapX + 18;
      if (entry.side === 'left') entry.tp.x = Math.max(sideInset, entry.tp.x);
      else entry.tp.x = Math.min(w - sideInset, entry.tp.x);
      var rawX = entry.side === 'left'
        ? entry.tp.x - entry.labelWidth - totalGapX
        : entry.tp.x + totalGapX;
      var rawY = entry.tp.y + entry.dy - boxH / 2;
      entry.labelBox = {
        x: Math.max(minX, Math.min(maxX - entry.labelWidth, rawX)),
        y: Math.max(minY, Math.min(maxY - boxH, rawY)),
        w: entry.labelWidth,
        h: boxH
      };
    }

    entries.sort(function(a, b) { return a.labelBox.y - b.labelBox.y; });
    for (var fi = 1; fi < entries.length; fi++) {
      var prev = entries[fi - 1].labelBox;
      var cur = entries[fi].labelBox;
      if (cur.y < prev.y + prev.h + 6) cur.y = prev.y + prev.h + 6;
    }
    for (var bi = entries.length - 1; bi >= 0; bi--) {
      var box = entries[bi].labelBox;
      if (box.y + box.h > maxY) box.y = maxY - box.h;
      if (bi > 0) {
        var prevBox = entries[bi - 1].labelBox;
        if (prevBox.y + prevBox.h + 6 > box.y) prevBox.y = Math.max(minY, box.y - prevBox.h - 6);
      }
    }

    for (var ai = 0; ai < entries.length; ai++) {
      var item = entries[ai];
      var boxX = item.labelBox.x;
      var boxY = item.labelBox.y;
      var boxH2 = item.labelBox.h;
      var anchorX = item.side === 'left' ? boxX + item.labelBox.w : boxX;
      var anchorY = Math.max(boxY + 6, Math.min(boxY + boxH2 - 6, item.tp.y));
      item.labelPoint = { x: anchorX, y: anchorY };
      item.textX = boxX + 10;
      item.textY = boxY + 18;
    }
  }

  layoutThreatLabels(threatMeta);

  for (var ti = 0; ti < threatMeta.length; ti++) {
    var meta = threatMeta[ti];
    threatEls.push(createVNode('g', { class: 'threat-origin', 'data-action': 'attack-from-' + meta.threat.id }, [
      createVNode('line', {
        x1: String(meta.tp.x), y1: String(meta.tp.y),
        x2: String(meta.labelPoint.x), y2: String(meta.labelPoint.y),
        class: 'threat-label-link', stroke: meta.threat.color
      }, []),
      createVNode('circle', { cx: String(meta.tp.x), cy: String(meta.tp.y), r: '8', class: 'threat-ring',
        fill: meta.threat.color, stroke: meta.threat.color, 'fill-opacity': '0.28', 'stroke-width': '2' }, []),
      createVNode('rect', {
        x: String(meta.labelBox.x), y: String(meta.labelBox.y), width: String(meta.labelBox.w), height: String(meta.labelBox.h),
        rx: '7', ry: '7', class: 'threat-label-box', stroke: meta.threat.color
      }, []),
      createVNode('circle', { cx: String(meta.labelPoint.x), cy: String(meta.labelPoint.y), r: '3.5', class: 'threat-label-dot', fill: meta.threat.color }, []),
      createVNode('text', { x: String(meta.textX), y: String(meta.textY), class: 'threat-label', 'text-anchor': 'start' }, [
        createTextVNode(meta.labelText)
      ])
    ]));
  }

  // ?먥븧 鍮꾪뻾 以묒씤 誘몄궗??沅ㅼ쟻 ??BALLISTIC(??? vs NORMAL ?쒓컖 ?꾩쟾 遺꾨━ ?먥븧

  // SVG defs: ?꾨룄誘몄궗???꾩슜 湲濡쒖슦 ?꾪꽣 + 誘몄궗???꾩씠肄??щ낵
  var defsChildren = [];
  defsChildren.push(createVNode('filter', { id: 'ballistic-glow', x: '-120%', y: '-120%', width: '340%', height: '340%' }, [
    createVNode('feGaussianBlur', { stdDeviation: '7', result: 'blur' }, []),
    createVNode('feFlood', { 'flood-color': '#ef4444', 'flood-opacity': '0.95', result: 'color' }, []),
    createVNode('feComposite', { in: 'color', in2: 'blur', operator: 'in', result: 'glow' }, []),
    createVNode('feMerge', {}, [
      createVNode('feMergeNode', { in: 'glow' }, []),
      createVNode('feMergeNode', { in: 'glow' }, []),
      createVNode('feMergeNode', { in: 'SourceGraphic' }, [])
    ])
  ]));
  defsChildren.push(createVNode('filter', { id: 'ballistic-trail-glow', x: '-120%', y: '-120%', width: '340%', height: '340%' }, [
    createVNode('feGaussianBlur', { stdDeviation: '6', result: 'blur' }, []),
    createVNode('feMerge', {}, [
      createVNode('feMergeNode', { in: 'blur' }, []),
      createVNode('feMergeNode', { in: 'SourceGraphic' }, [])
    ])
  ]));
  defsChildren.push(createVNode('symbol', { id: 'ballistic-icon', viewBox: '0 0 22 52' }, [
    createVNode('path', {
      d: 'M11 0 L17 10 L17 34 L21 44 L21 47 L15 44 L15 52 L7 52 L7 44 L1 47 L1 44 L5 34 L5 10 Z',
      fill: '#dc2626', stroke: '#7f1d1d', 'stroke-width': '1.2', 'stroke-linejoin': 'round'
    }, []),
    createVNode('path', {
      d: 'M11 4 L14 11 L14 34 L11 40 L8 34 L8 11 Z',
      fill: '#fca5a5', 'fill-opacity': '0.28'
    }, []),
    createVNode('path', {
      d: 'M11 42 L16 50 L11 48 L6 50 Z',
      fill: '#991b1b', 'fill-opacity': '0.92'
    }, [])
  ]));
  var defsEl = createVNode('defs', {}, defsChildren);

  var missileEls = [defsEl];
  for (var mi = 0; mi < props.natMissiles.length; mi++) {
    var nm = props.natMissiles[mi];
    if (!nm.active) continue;
    var ball = isBallistic(nm.type);
    var mx = Math.round(nm.x), my = Math.round(nm.y);

    if (ball) {
      // ?? 怨좉퀬???꾨룄誘몄궗?? ?몃젅???놁쓬, ??鍮④컙 ??+ 湲濡쒖슦留???
      missileEls.push(createVNode('circle', {
        cx: String(mx), cy: String(my), r: '7',
        fill: '#dc2626', stroke: '#fca5a5', 'stroke-width': '2'
      }, []));
      missileEls.push(createVNode('circle', {
        cx: String(mx), cy: String(my), r: '16',
        fill: 'none', stroke: '#dc2626', 'stroke-width': '2', 'stroke-opacity': '0.4',
        class: 'ballistic-aura'
      }, []));
    } else {
      var ndx = nm.targetX - nm.x, ndy = nm.targetY - nm.y;
      var nlen = Math.sqrt(ndx * ndx + ndy * ndy) || 1;
      var ux = ndx / nlen, uy = ndy / nlen;
      var tailLen = nm.type === 'drone' ? 9 : 13;
      var tailX = mx - ux * tailLen;
      var tailY = my - uy * tailLen;

      missileEls.push(createVNode('line', {
        x1: String(Math.round(tailX)), y1: String(Math.round(tailY)), x2: String(mx), y2: String(my),
        stroke: '#ef4444', 'stroke-width': nm.type === 'drone' ? '1.1' : '1.5', 'stroke-opacity': '0.32',
        class: 'missile-path normal-missile-trail'
      }, []));
      missileEls.push(createVNode('circle', {
        cx: String(mx), cy: String(my), r: nm.type === 'drone' ? '2.5' : '3.1',
        class: 'normal-missile-dot'
      }, []));
    }
  }

  // 寃쎈낫 諛곕꼫
  var alertEl = [];
  var attackCities = [];
  for (var aci = 0; aci < props.natMissiles.length; aci++) {
    var am = props.natMissiles[aci];
    if (am.active && attackCities.indexOf(am.targetCityName) < 0) attackCities.push(am.targetCityName);
  }
  if (attackCities.length > 0) {
    alertEl.push(createVNode('div', { class: 'alert-banner' }, [
      createTextVNode('Inbound threats detected'),
      createVNode('br', {}, []),
      createTextVNode(attackCities.join(' 쨌 '))
    ]));
  }

  // HUD
  var activeTracks = props.natMissiles.filter(function(m){return m.active;}).length;
  var scenarioBtn = [];
  if (!props.scenarioRunning) {
    scenarioBtn.push(createVNode('div', { style: 'margin-top:8px' }, [
      createVNode('button', { class: 'status-btn target-active', 'data-action': 'run-scenario', style: 'font-size:14px;padding:8px 16px' }, [
        createTextVNode('?? Run True Promise scenario')
      ])
    ]));
  } else {
    scenarioBtn.push(createVNode('div', { style: 'margin-top:8px;color:var(--alert-red);font-size:14px;font-weight:700;letter-spacing:1px' }, [
      createTextVNode('??SCENARIO ACTIVE')
    ]));
  }

  var hudEl = createVNode('div', { class: 'national-hud' }, [
    createTextVNode('Israel Iron Dome')
  ].concat(scenarioBtn));

  // ?? ?쒕굹由ъ삤 ?뺣낫 ?⑤꼸 (?ㅽ뻾 以묒씪 ?뚮쭔) ??
  var scenarioInfoEl = [];
  if (props.scenarioRunning) {
    var elapsed = props.scenarioElapsed || 0;
    var mins = Math.floor(elapsed / 60);
    var secs = elapsed % 60;
    var timeStr = (mins < 10 ? '0' : '') + mins + ':' + (secs < 10 ? '0' : '') + secs;
    var intercepted = props.scenarioIntercepted || 0;
    var breached = props.scenarioBreached || 0;
    var totalLaunched = intercepted + breached + activeTracks;
    var interceptRate = totalLaunched > 0 ? Math.round((intercepted / totalLaunched) * 100) : 0;

    scenarioInfoEl.push(createVNode('div', { class: 'scenario-info-panel' }, [
      createVNode('div', { class: 'scenario-info-subtitle' }, [
        createTextVNode('April 13-14, 2024  쨌  01:45 AM Israel Time')
      ]),
      createVNode('div', { class: 'scenario-info-sep' }, []),
      createVNode('div', { class: 'scenario-info-row' }, [
        createVNode('span', { class: 'scenario-info-label' }, [createTextVNode('Elapsed')]),
        createVNode('span', { class: 'scenario-info-value scenario-info-live' }, [createTextVNode(timeStr)])
      ]),
      createVNode('div', { class: 'scenario-info-row' }, [
        createVNode('span', { class: 'scenario-info-label' }, [createTextVNode('Inbound')]),
        createVNode('span', { class: 'scenario-info-value scenario-info-live' }, [createTextVNode(String(activeTracks))])
      ]),
      createVNode('div', { class: 'scenario-info-row' }, [
        createVNode('span', { class: 'scenario-info-label' }, [createTextVNode('Intercept rate')]),
        createVNode('span', { class: 'scenario-info-value scenario-info-live' }, [createTextVNode(interceptRate + '%')])
      ])
    ]));
  }

  var svgEl = createVNode('svg', { class: 'national-svg', xmlns: SVG_NS }, cityEls.concat(threatEls).concat(missileEls));

  return createVNode('div', { class: 'national-view', style: bgStyle, 'data-national': 'true' }, [svgEl, hudEl].concat(scenarioInfoEl).concat(alertEl));
}

// 3D VNode 而댄룷?뚰듃
function View3D(props) {
  var cls = 'view-3d' + (props.visible ? '' : ' hidden') + (props.targetMode ? ' targeting' : '');
  var stats = 'Threats ' + props.totalAttacks + '  Inbound ' + props.activeMissiles + '  Sectors ' + props.radarZones.length + '  Breaches ' + props.breachCount;
  var hudChildren = [
    createTextVNode(props.cityName + ' terminal view'),
    createVNode('br', {}, []),
    createTextVNode('Time ' + props.currentTimeLabel),
    createVNode('br', {}, []),
    createTextVNode(stats)
  ];
  if (props.targetMode) {
    hudChildren.push(createVNode('br', {}, []));
    hudChildren.push(createTextVNode('Click to place inbound tracks'));
  }
  return createVNode('div', { class: cls, 'data-3d': 'true' }, [
    createVNode('div', { class: 'view-3d-hud' }, hudChildren)
  ]);
}

function TestView(props) {
  var cards = props.results.map(function(r) {
    return createVNode('div', { class: 'test-card' }, [
      createVNode('div', { class: 'test-badge ' + (r.pass ? 'pass' : 'fail') }, [createTextVNode(r.pass ? 'PASS' : 'FAIL')]),
      createVNode('span', { class: 'test-name' }, [createTextVNode(r.name)]),
      createVNode('span', { class: 'test-type-badge' }, [createTextVNode(r.expected)]),
      createVNode('span', { class: 'test-detail' }, [createTextVNode(r.detail)])
    ]);
  });
  var pc = props.results.filter(function(r) { return r.pass; }).length;
  return createVNode('div', { class: 'test-view' + (props.visible ? ' show' : '') }, [
    createVNode('div', { class: 'test-title' }, [createTextVNode('Validation')]),
    createVNode('div', { class: 'test-subtitle' }, [createTextVNode(pc + '/' + props.results.length + ' passed 쨌 diff engine checks')])
  ].concat(cards));
}

function BriefingView(props) {
  var chips = ['Virtual DOM', 'Scenario timeline', '2D sector editor', '3D extrusion', 'Validation'];
  var kpis = [
    { value: '1', label: 'Custom UI engine', detail: 'diff + render + patch in plain JavaScript' },
    { value: String(props.cityCount || 0), label: 'Defense cities', detail: 'each city keeps its own sector state and 3D scene' },
    { value: String(props.scenarioCount || 0), label: 'Scenario sets', detail: 'national attacks route into city-level views' },
    { value: String(props.testCount || 0), label: 'Validation checks', detail: 'patch behavior is proven in the Tests tab' }
  ];
  var architectureCards = [
    {
      eyebrow: 'ASSIGNMENT FIT',
      title: 'Why this is more than a map demo',
      text: 'The course core is the virtual DOM pipeline. This project uses that custom diff and patch engine to drive a multi-view defense simulator instead of relying on React or another framework.'
    },
    {
      eyebrow: 'STATE MODEL',
      title: 'How complexity is managed',
      text: 'National threats, city sectors, 3D scenes, siren state, breach markers, and timing all live in coordinated state. Each city keeps its own simulation snapshot so zooming in and out stays consistent.'
    },
    {
      eyebrow: 'GEOMETRY',
      title: 'Why the drawn sectors matter',
      text: 'The sector editor is not cosmetic. The polygon drawn in the 2D sector screen is the same defense geometry used for interception checks and the same shape extruded into the 3D city volume.'
    },
    {
      eyebrow: 'VALIDATION',
      title: 'What proves the implementation',
      text: 'The Tests screen shows the low-level engine behavior: no-op patches, text changes, attribute updates, create/remove, replace, and undo/redo. That gives the simulator a solid technical base.'
    }
  ];
  var flowSteps = [
    { num: '01', title: 'National detection', copy: 'Long-range threats appear on the country view first. This establishes the big-picture operating picture.' },
    { num: '02', title: 'Scenario routing', copy: 'When impact is near, the system focuses the threatened city instead of waiting until after the breach. This mirrors a control-room workflow.' },
    { num: '03', title: 'City defense simulation', copy: 'Each city uses stored sector geometry, interception capacity, breach tracking, and local 3D rendering to show the active air-defense state.' },
    { num: '04', title: 'Explainability', copy: 'Because every layer is connected to the same underlying state and renderer, we can explain exactly how a national event becomes a city-level visual response.' }
  ];
  var talkTrack = [
    'Open with the engine: this project implements a custom virtual DOM renderer and patcher, then applies it to a real-time simulation UI.',
    'Show continuity: the same defense polygon appears in the sector editor, the interception logic, and the 3D city volume.',
    'Show orchestration: the national map, zoom-in flow, siren, and per-city views are coordinated by one scenario timeline.',
    'Close with proof: the Tests tab demonstrates that the diff and patch primitives behave correctly under updates and reversals.'
  ];

  return createVNode('div', { class: 'briefing-view' + (props.visible ? ' show' : '') }, [
    createVNode('div', { class: 'briefing-hero' }, [
      createVNode('div', { class: 'briefing-title' }, [createTextVNode('Project Briefing')]),
      createVNode('div', { class: 'briefing-subtitle' }, [createTextVNode('Use this screen to explain why the simulator fits the assignment and how the more complex parts work. It frames the project as a custom virtual DOM system with layered simulation, geometry, and visualization rather than as a simple defense-themed animation.')]),
      createVNode('div', { class: 'briefing-chip-row' }, chips.map(function(chip) {
        return createVNode('span', { class: 'briefing-chip' }, [createTextVNode(chip)]);
      })),
      createVNode('div', { class: 'briefing-kpis' }, kpis.map(function(kpi) {
        return createVNode('div', { class: 'briefing-kpi' }, [
          createVNode('div', { class: 'briefing-kpi-value' }, [createTextVNode(kpi.value)]),
          createVNode('div', { class: 'briefing-kpi-label' }, [createTextVNode(kpi.label)]),
          createVNode('div', { class: 'briefing-kpi-detail' }, [createTextVNode(kpi.detail)])
        ]);
      }))
    ]),
    createVNode('div', { class: 'briefing-section' }, [
      createVNode('div', { class: 'briefing-section-title' }, [createTextVNode('Architecture Overview')]),
      createVNode('div', { class: 'briefing-grid' }, architectureCards.map(function(card) {
        return createVNode('div', { class: 'briefing-card' }, [
          createVNode('div', { class: 'briefing-card-eyebrow' }, [createTextVNode(card.eyebrow)]),
          createVNode('div', { class: 'briefing-card-title' }, [createTextVNode(card.title)]),
          createVNode('div', { class: 'briefing-card-text' }, [createTextVNode(card.text)])
        ]);
      }))
    ]),
    createVNode('div', { class: 'briefing-section' }, [
      createVNode('div', { class: 'briefing-section-title' }, [createTextVNode('Operational Flow')]),
      createVNode('div', { class: 'briefing-flow' }, flowSteps.map(function(step) {
        return createVNode('div', { class: 'briefing-flow-step' }, [
          createVNode('div', { class: 'briefing-step-num' }, [createTextVNode(step.num)]),
          createVNode('div', { class: 'briefing-step-title' }, [createTextVNode(step.title)]),
          createVNode('div', { class: 'briefing-step-copy' }, [createTextVNode(step.copy)])
        ]);
      }))
    ]),
    createVNode('div', { class: 'briefing-section' }, [
      createVNode('div', { class: 'briefing-section-title' }, [createTextVNode('Suggested Presentation Track')]),
      createVNode('div', { class: 'briefing-grid' }, [
        createVNode('div', { class: 'briefing-card' }, [
          createVNode('div', { class: 'briefing-card-eyebrow' }, [createTextVNode('HOW TO TALK THROUGH IT')]),
          createVNode('div', { class: 'briefing-card-title' }, [createTextVNode('Four points to use when presenting')]),
          createVNode('div', { class: 'briefing-list' }, talkTrack.map(function(line, idx) {
            return createVNode('div', { class: 'briefing-list-row' }, [
              createVNode('div', { class: 'briefing-list-mark' }, [createTextVNode(String(idx + 1))]),
              createVNode('div', { class: 'briefing-list-copy' }, [createTextVNode(line)])
            ]);
          }))
        ]),
        createVNode('div', { class: 'briefing-card' }, [
          createVNode('div', { class: 'briefing-card-eyebrow' }, [createTextVNode('WHAT THE SCREEN PROVES')]),
          createVNode('div', { class: 'briefing-card-title' }, [createTextVNode('Why this helps with the assignment explanation')]),
          createVNode('div', { class: 'briefing-card-text' }, [createTextVNode('This page gives you a clean narrative: core engine, synchronized state, geometry reuse, and validation. That makes the project easier to justify as a technically grounded weekly assignment instead of a UI-only prototype.')]),
          createVNode('div', { class: 'briefing-callout' }, [createTextVNode('Recommended demo order: National map -> city zoom -> sector editing -> 3D city volume -> Tests -> Briefing. That sequence shows both spectacle and technical depth.')])
        ])
      ])
    ])
  ]);
}

// ?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧
// SECTION 8: TEST SUITE
// ?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧

function runVDomTests() {
  var R = [];
  var o1 = createVNode('div', { class: 'status' }, [createTextVNode('Active')]);
  var n1 = createVNode('div', { class: 'status' }, [createTextVNode('Active')]);
  var p1 = diff(o1, n1);
  R.push({ name: 'No-op Patch', expected: 'NULL', pass: p1 === null, detail: p1 === null ? 'No patch' : 'Unexpected' });

  var o2 = createVNode('span', {}, [createTextVNode('ACTIVE')]);
  var n2 = createVNode('span', {}, [createTextVNode('DESTROYED')]);
  var p2 = diff(o2, n2);
  R.push({ name: 'Text Node Change', expected: 'UPDATE', pass: p2 !== null && p2.type === UPDATE, detail: p2 ? p2.type : 'none' });

  var o3 = createVNode('div', { style: 'left:100px' }, []);
  var n3 = createVNode('div', { style: 'left:300px' }, []);
  var p3 = diff(o3, n3);
  R.push({ name: 'Attribute Update', expected: 'UPDATE', pass: p3 !== null && p3.type === UPDATE && p3.propPatches.length > 0, detail: p3 ? p3.propPatches.length + ' props' : 'none' });

  var p4 = diffChildren([createVNode('div', { id: 'r1' }, [])], [createVNode('div', { id: 'r1' }, []), createVNode('div', { id: 'r2' }, [])]);
  R.push({ name: 'Node Create', expected: 'CREATE', pass: p4.length > 0 && p4[p4.length - 1].patch.type === CREATE, detail: p4.length ? p4[p4.length - 1].patch.type : 'none' });

  var p5 = diffChildren([createVNode('div', {}, []), createVNode('div', {}, [])], [createVNode('div', {}, [])]);
  R.push({ name: 'Node Remove', expected: 'REMOVE', pass: p5.length > 0 && p5[p5.length - 1].patch.type === REMOVE, detail: p5.length ? p5[p5.length - 1].patch.type : 'none' });

  var p6 = diff(createVNode('h3', {}, []), createVNode('h2', {}, []));
  R.push({ name: 'Element Replace', expected: 'REPLACE', pass: p6 !== null && p6.type === REPLACE, detail: p6 ? 'h3?뭜2' : 'none' });

  var box = document.createElement('div');
  var ov = createVNode('div', { class: 'a' }, [createTextVNode('X')]);
  box.appendChild(renderVNode(ov));
  var oH = box.innerHTML;
  var mv = createVNode('div', { class: 'b' }, [createTextVNode('Y')]);
  applyPatch(box, box.firstChild, diff(ov, mv));
  var mH = box.innerHTML;
  applyPatch(box, box.firstChild, diff(mv, ov));
  var uOk = box.innerHTML === oH;
  applyPatch(box, box.firstChild, diff(ov, mv));
  var rOk = box.innerHTML === mH;
  R.push({ name: 'Undo / Redo', expected: 'PASS', pass: uOk && rOk, detail: 'Undo=' + (uOk ? 'OK' : 'FAIL') + ' Redo=' + (rOk ? 'OK' : 'FAIL') });

  return R;
}

// ?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧
// SECTION 9: ROOT COMPONENT ??App
// ?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧

var _droneAlive = true, _isDrawing = false, _targetMode = false;
var _pressedKeys = {}, _radarZones = [], _zoneId = 1;
var _missiles = [], _missileId = 1;
var _scenarioTimers = [];
var _multi3dScenes = {}; // cityId ??{ scene, renderer, camera, animId }
var _alertAudio = {
  ctx: null,
  master: null,
  filter: null,
  compressor: null,
  mix: null,
  oscA: null,
  oscB: null,
  lfo: null,
  lfoGainA: null,
  lfoGainB: null,
  releaseSeconds: 1.8,
  lowA: 240,
  highA: 760,
  lowB: 120,
  highB: 380,
  armed: false,
  active: false,
  wanted: false
};

function ensureAlertAudio() {
  if (_alertAudio.ctx) return _alertAudio;
  var Ctx = window.AudioContext || window.webkitAudioContext;
  if (!Ctx) return null;
  var ctx = new Ctx();
  var master = ctx.createGain();
  var filter = ctx.createBiquadFilter();
  var compressor = ctx.createDynamicsCompressor();
  master.gain.value = 0.0001;
  filter.type = 'lowpass';
  filter.frequency.value = 1500;
  compressor.threshold.value = -24;
  compressor.knee.value = 10;
  compressor.ratio.value = 3;
  compressor.attack.value = 0.003;
  compressor.release.value = 0.25;
  master.connect(filter);
  filter.connect(compressor);
  compressor.connect(ctx.destination);
  _alertAudio.ctx = ctx;
  _alertAudio.master = master;
  _alertAudio.filter = filter;
  _alertAudio.compressor = compressor;
  return _alertAudio;
}

function armAlertAudio() {
  var state = ensureAlertAudio();
  if (!state) return;
  state.armed = true;
  if (state.ctx && state.ctx.state === 'suspended') state.ctx.resume();
  if (state.wanted) startAlertSiren();
}

function startAlertSiren() {
  var state = ensureAlertAudio();
  if (!state) return;
  state.wanted = true;
  if (state.active) {
    if (state.ctx && state.ctx.state === 'suspended') state.ctx.resume();
    return;
  }
  if (!state.armed) return;
  var ctx = state.ctx;
  if (ctx.state === 'suspended') ctx.resume();
  var now = ctx.currentTime;
  var mix = ctx.createGain();
  var oscA = ctx.createOscillator();
  var oscB = ctx.createOscillator();
  var riseSeconds = 4.5;
  var sustainSeconds = 26.0;
  var lowA = state.lowA;
  var highA = state.highA;
  var lowB = state.lowB;
  var highB = state.highB;

  mix.gain.value = 0.18;
  oscA.type = 'triangle';
  oscB.type = 'sine';

  oscA.frequency.cancelScheduledValues(now);
  oscB.frequency.cancelScheduledValues(now);
  oscA.frequency.setValueAtTime(lowA, now);
  oscB.frequency.setValueAtTime(lowB, now);
  oscA.frequency.exponentialRampToValueAtTime(highA, now + riseSeconds);
  oscB.frequency.exponentialRampToValueAtTime(highB, now + riseSeconds);
  oscA.frequency.setValueAtTime(highA, now + riseSeconds + sustainSeconds);
  oscB.frequency.setValueAtTime(highB, now + riseSeconds + sustainSeconds);

  oscA.connect(mix);
  oscB.connect(mix);
  mix.connect(state.master);

  state.filter.frequency.setValueAtTime(1400, now);
  state.filter.frequency.linearRampToValueAtTime(2200, now + riseSeconds);
  state.master.gain.cancelScheduledValues(now);
  state.master.gain.setValueAtTime(0.0001, now);
  state.master.gain.linearRampToValueAtTime(0.24, now + 0.35);

  oscA.start(now);
  oscB.start(now);

  state.mix = mix;
  state.oscA = oscA;
  state.oscB = oscB;
  state.lfo = null;
  state.lfoGainA = null;
  state.lfoGainB = null;
  state.active = true;
}

function stopAlertSiren() {
  var state = _alertAudio;
  state.wanted = false;
  if (!state.active || !state.ctx) return;
  var now = state.ctx.currentTime;
  var releaseSeconds = state.releaseSeconds || 1.8;
  var stopAt = now + releaseSeconds;

  function holdParam(param) {
    if (!param) return;
    if (typeof param.cancelAndHoldAtTime === 'function') param.cancelAndHoldAtTime(now);
    else {
      var current = param.value;
      param.cancelScheduledValues(now);
      param.setValueAtTime(current, now);
    }
  }

  holdParam(state.master.gain);
  holdParam(state.filter.frequency);
  if (state.oscA) holdParam(state.oscA.frequency);
  if (state.oscB) holdParam(state.oscB.frequency);

  if (state.oscA) state.oscA.frequency.exponentialRampToValueAtTime(state.lowA, stopAt);
  if (state.oscB) state.oscB.frequency.exponentialRampToValueAtTime(state.lowB, stopAt);
  state.filter.frequency.linearRampToValueAtTime(1100, stopAt);
  state.master.gain.linearRampToValueAtTime(0.0001, stopAt);

  try { state.oscA.stop(stopAt + 0.05); } catch (e) {}
  try { state.oscB.stop(stopAt + 0.05); } catch (e) {}
  try { state.lfo.stop(stopAt + 0.05); } catch (e) {}

  state.active = false;
  state.mix = null;
  state.oscA = null;
  state.oscB = null;
  state.lfo = null;
  state.lfoGainA = null;
  state.lfoGainB = null;
}

function setAlertSirenActive(active) {
  _alertAudio.wanted = active;
  if (active) startAlertSiren();
  else stopAlertSiren();
}

function App() {
  var _s = function(v) { var r = useState(v); return r; };

  var s1 = useState('national');    var activeView = s1[0], setActiveView = s1[1];
  var s1a = useState(DEFAULT_SIM_CITY_ID); var selectedSimCityId = s1a[0], setSelectedSimCityId = s1a[1];
  var _initialStore = (function() {
    var store = {};
    for (var i = 0; i < DEFENSE_CITIES.length; i++) {
      store[DEFENSE_CITIES[i].id] = createDefaultSimState(DEFENSE_CITIES[i].id);
    }
    return store;
  })();
  var s1b = useState(_initialStore);  var simCityStore = s1b[0], setSimCityStore = s1b[1];
  var s2 = useState({ x: 0, y: 0 }); var dronePos = s2[0], setDronePos = s2[1];
  var s3 = useState(false);        var droneAlive = s3[0], setDroneAlive = s3[1];
  var s4 = useState(0);            var droneAngle = s4[0], setDroneAngle = s4[1];
  var s5 = useState((_initialStore[DEFAULT_SIM_CITY_ID] || createDefaultSimState()).radarZones); var radarZones = s5[0], setRadarZones = s5[1];
  var s6 = useState(false);        var isDrawing = s6[0], setIsDrawing = s6[1];
  var s7 = useState([]);           var drawPoints = s7[0], setDrawPoints = s7[1];
  var s8 = useState(null);         var interceptPos = s8[0], setInterceptPos = s8[1];
  var s9 = useState(false);        var targetMode = s9[0], setTargetMode = s9[1];
  var s10 = useState([]);          var missiles = s10[0], setMissiles = s10[1];
  var s11 = useState([]);          var breaches = s11[0], setBreaches = s11[1];
  var s12 = useState([]);          var targets = s12[0], setTargets = s12[1];
  var s13 = useState(false);       var ratioWarn = s13[0], setRatioWarn = s13[1];
  var s14 = useState(0);           var totalAttacks = s14[0], setTotalAttacks = s14[1];
  var s15 = useState(new Date());  var currentTime = s15[0], setCurrentTime = s15[1];
  var s16 = useState([]);          var interceptors = s16[0], setInterceptors = s16[1];
  var s17 = useState([]);          var natMissiles = s17[0], setNatMissiles = s17[1];
  var s18 = useState(false);       var scenarioRunning = s18[0], setScenarioRunning = s18[1];
  var s19 = useState([]);          var attackedCities = s19[0], setAttackedCities = s19[1];
  var s20 = useState(null);        var multiCities = s20[0], setMultiCities = s20[1];
  var s21 = useState(0);           var multi3dSession = s21[0], setMulti3dSession = s21[1];
  var s22 = useState(0);           var multi3dCooldownUntil = s22[0], setMulti3dCooldownUntil = s22[1];
  var s23 = useState(0);           var scenarioElapsed = s23[0], setScenarioElapsed = s23[1];
  var s24 = useState(0);           var scenarioIntercepted = s24[0], setScenarioIntercepted = s24[1];
  var s25 = useState(0);           var scenarioBreached = s25[0], setScenarioBreached = s25[1];
  _droneAlive = droneAlive; _isDrawing = isDrawing; _targetMode = targetMode; _radarZones = radarZones;

  var testResults = useMemo(function() { return runVDomTests(); }, []);
  var currentTimeLabel = useMemo(function() { return formatClock(currentTime); }, [currentTime]);
  var selectedSimCity = useMemo(function() {
    return getDefenseCityById(selectedSimCityId) || { id: DEFAULT_SIM_CITY_ID, name: 'Tel Aviv' };
  }, [selectedSimCityId]);

  function persistCurrentSimState(cityId) {
    var snapshot = cloneSimState({
      dronePos: dronePos,
      droneAlive: droneAlive,
      droneAngle: droneAngle,
      radarZones: radarZones,
      missiles: missiles,
      breaches: breaches,
      targets: targets,
      interceptors: interceptors,
      totalAttacks: totalAttacks
    });
    setSimCityStore(function(store) {
      var next = Object.assign({}, store);
      next[cityId || selectedSimCityId] = snapshot;
      return next;
    });
  }

  function getMulti3dZonesForCity(cityId) {
    if (cityId === selectedSimCityId) return radarZones;
    var snapshot = simCityStore[cityId];
    return snapshot && snapshot.radarZones ? snapshot.radarZones : [];
  }

  var totalArea = useMemo(function() {
    return radarZones.reduce(function(s, z) { return s + polygonArea(z.points); }, 0);
  }, [radarZones]);

  // 痍⑥빟 吏??怨꾩궛 (?덉씠???녿뒗 怨?鍮④컙??
  var vulnPoints = useMemo(function() {
    if (radarZones.length === 0) return [];
    return computeVulnerableGrid(radarZones, window.innerWidth, window.innerHeight - SIM_TOP - SIM_BOTTOM, 60);
  }, [radarZones]);

  // ?쒓퀎 ?낅뜲?댄듃
  useEffect(function() {
    var timerId = setInterval(function() { setCurrentTime(new Date()); }, 1000);
    return function() { clearInterval(timerId); };
  }, []);

  // ?쒕굹由ъ삤 寃쎄낵?쒓컙 移댁슫??
  useEffect(function() {
    if (!scenarioRunning) return;
    setScenarioElapsed(0);
    var timerId = setInterval(function() {
      setScenarioElapsed(function(p) { return p + 1; });
    }, 1000);
    return function() { clearInterval(timerId); };
  }, [scenarioRunning]);

  // ?좏깮???꾩떆???쒕??덉씠???곹깭 濡쒕뱶
  useEffect(function() {
    var snapshot = cloneSimState(simCityStore[selectedSimCityId] || createDefaultSimState(selectedSimCityId));
    setDronePos(snapshot.dronePos);
    setDroneAlive(snapshot.droneAlive);
    setDroneAngle(snapshot.droneAngle);
    setRadarZones(snapshot.radarZones);
    setMissiles(snapshot.missiles);
    setBreaches(snapshot.breaches);
    setTargets(snapshot.targets);
    setInterceptors(snapshot.interceptors);
    setTotalAttacks(snapshot.totalAttacks);
    setInterceptPos(null);
    setDrawPoints([]);
    setIsDrawing(false);
    setTargetMode(false);
    setRatioWarn(false);
  }, [selectedSimCityId]);

  // 寃쎈낫 ?ㅻ뵒???쒖꽦??
  useEffect(function() {
    function arm() { armAlertAudio(); }
    document.addEventListener('pointerdown', arm, true);
    document.addEventListener('keydown', arm, true);
    return function() {
      document.removeEventListener('pointerdown', arm, true);
      document.removeEventListener('keydown', arm, true);
      stopAlertSiren();
    };
  }, []);

  // 誘몄궗???쒕??덉씠??猷⑦봽
  useEffect(function() {
    var animId;
    var mSpeed = 3;
    function missileLoop() {
      animId = requestAnimationFrame(missileLoop);
      setMissiles(function(prev) {
        if (prev.length === 0) return prev;
        var changed = false;
        var now = Date.now();
        var newBreaches = [];
        var newInterceptors = [];
        var zoneUpdates = {};
        var newMissiles = prev.map(function(m) {
          if (m.intercepted) {
            changed = true;
            return m;
          }
          if (!m.active) return m;
          // ?대룞
          var dx = m.targetX - m.x, dy = m.targetY - m.y;
          var dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 5) {
            // ?꾩갑 ??breach!
            changed = true;
            newBreaches.push({ x: m.targetX, y: m.targetY });
            return Object.assign({}, m, { active: false });
          }
          var nx = m.x + (dx / dist) * mSpeed;
          var ny = m.y + (dy / dist) * mSpeed;
          // ?덉씠??泥댄겕 ??寃뱀튂??議댁씠 ?щ윭 媛쒕㈃ 以묒떖??媛??媛源뚯슫 議댁씠 ?곗꽑 ?붽꺽
          var hitZones = [];
          for (var zi = 0; zi < _radarZones.length; zi++) {
            var z = _radarZones[zi];
            var concurrent = (zoneUpdates[z.id] || 0) + (z.active || 0);
            if (z.capacity > 0 && concurrent < (z.maxConcurrent || 100) && pointInPolygon(nx, ny, z.points)) {
              var cdx = nx - z.center.x, cdy = ny - z.center.y;
              var impactPoint = findPolygonImpactPoint({ x: m.x, y: m.y }, { x: nx, y: ny }, z.points)
                || findPolygonSurfacePoint(z.center, { x: nx, y: ny }, z.points)
                || { x: nx, y: ny };
              hitZones.push({ zone: z, dist: cdx * cdx + cdy * cdy, impactPoint: impactPoint });
            }
          }
          if (hitZones.length > 0) {
            hitZones.sort(function(a, b) { return a.dist - b.dist; });
            var closestHit = hitZones[0];
            var closest = closestHit.zone;
            var impactPoint = closestHit.impactPoint;
            var travelDx = impactPoint.x - closest.center.x, travelDy = impactPoint.y - closest.center.y;
            var travelMs = Math.max(140, Math.min(320, Math.round(Math.sqrt(travelDx * travelDx + travelDy * travelDy) * 1.25)));
            var interceptTime = now;
            changed = true;
            if (!zoneUpdates[closest.id]) zoneUpdates[closest.id] = 0;
            zoneUpdates[closest.id]++;
            newInterceptors.push({
              id: 'int-' + m.id + '-' + interceptTime,
              startX: closest.center.x,
              startY: closest.center.y,
              targetX: impactPoint.x,
              targetY: impactPoint.y,
              launchedAt: interceptTime,
              travelMs: travelMs,
              expiresAt: interceptTime + travelMs
            });
            return Object.assign({}, m, {
              x: impactPoint.x,
              y: impactPoint.y,
              active: false,
              intercepted: true,
              interceptTime: interceptTime,
              interceptorTravelMs: travelMs,
              interceptorPopMs: INTERCEPT_POP_MS
            });
          }
          changed = true;
          return Object.assign({}, m, { x: nx, y: ny });
        });

        // zone capacity ?낅뜲?댄듃
        var zIds = Object.keys(zoneUpdates);
        if (zIds.length > 0) {
          setRadarZones(function(zp) {
            return zp.map(function(z) {
              return zoneUpdates[z.id] ? Object.assign({}, z, { capacity: Math.max(0, z.capacity - zoneUpdates[z.id]) }) : z;
            });
          });
        }
        // breach 異붽?
        if (newBreaches.length > 0) {
          setBreaches(function(bp) { return bp.concat(newBreaches); });
        }
        setInterceptors(function(prevInts) {
          var liveInts = prevInts.filter(function(interceptor) { return interceptor.expiresAt > now; });
          return newInterceptors.length > 0 ? liveInts.concat(newInterceptors) : liveInts;
        });

        // ?앸궃 誘몄궗???쒓굅 (?붽꺽 鍮꾪뻾 + ??컻 ?쒗쁽 ??
        newMissiles = newMissiles.filter(function(m) {
          if (m.intercepted) {
            var travelMs = m.interceptorTravelMs || INTERCEPT_TRAVEL_MS;
            var popMs = m.interceptorPopMs || INTERCEPT_POP_MS;
            return now - (m.interceptTime || now) <= travelMs + popMs;
          }
          if (!m.active && !m.intercepted) return false;
          return true;
        });

        return changed ? newMissiles : prev;
      });
    }
    animId = requestAnimationFrame(missileLoop);
    return function() { cancelAnimationFrame(animId); };
  }, []);

  // ?대┃ ?꾩엫
  useEffect(function() {
    function handleClick(e) {
      var a = e.target.closest('[data-action]');
      if (!a) return;
      var action = a.getAttribute('data-action');
      switch (action) {
        case 'view-national': setActiveView('national'); setTargetMode(false); setIsDrawing(false); break;
        case 'view-sim': setActiveView('sim'); setTargetMode(false); break;
        case 'view-3d': setActiveView('3d'); setIsDrawing(false); setDrawPoints([]); break;
        case 'view-test': setActiveView('test'); setTargetMode(false); setIsDrawing(false); break;
        case 'view-briefing': setActiveView('briefing'); setTargetMode(false); setIsDrawing(false); break;
        case 'toggle-draw':
          setIsDrawing(function(p) { return !p; }); setTargetMode(false); setDrawPoints([]); break;
        case 'toggle-target':
          setTargetMode(function(p) { return !p; }); setIsDrawing(false); setDrawPoints([]); break;
        case 'clear-all':
          setRadarZones([]); setBreaches([]); setTargets([]); setMissiles([]); setInterceptors([]); setTotalAttacks(0); setNatMissiles([]); setScenarioRunning(false); setAttackedCities([]);
          setMultiCities(null); setMulti3dCooldownUntil(0);
          setSimCityStore(function(store) {
            var next = Object.assign({}, store);
            next[selectedSimCityId] = createDefaultSimState(selectedSimCityId);
            return next;
          });
          break;
        case 'run-scenario':
          launchScenario('true-promise'); break;
        default:
          // attack-from-{id} ?몃뱾??
          if (action && action.indexOf('attack-from-') === 0) {
            var originId = action.replace('attack-from-', '');
            launchNatAttack(originId);
          }
          if (action && action.indexOf('select-sim-city-') === 0) {
            var simCityId = action.replace('select-sim-city-', '');
            if (simCityId !== selectedSimCityId) {
              persistCurrentSimState(selectedSimCityId);
              setSelectedSimCityId(simCityId);
              setActiveView('sim');
            }
          }
          // select-city-{id} ?몃뱾?????대떦 ?꾩떆 3D 酉?
          if (action && action.indexOf('select-city-') === 0) {
            var cityId = action.replace('select-city-', '');
            setMultiCities([cityId]);
            setActiveView('multi3d');
          }
          break;
      }
    }
    document.addEventListener('click', handleClick);
    return function() { document.removeEventListener('click', handleClick); };
  }, []);

  // ?덉씠??洹몃━湲?
  useEffect(function() {
    if (!isDrawing) return;
    var drawing = false, pts = [];
    var simW = window.innerWidth, simH = window.innerHeight - SIM_TOP - SIM_BOTTOM;
    var maxArea = simW * simH * 0.05; // ?붾㈃??5% ?댄븯留??덉슜

    function onDown(e) {
      if (!e.target.closest('[data-sim]')) return;
      drawing = true;
      pts = [{ x: e.clientX, y: toSimY(e.clientY) }];
      setDrawPoints(pts.slice());
    }

    function onMove(e) {
      if (!drawing) return;
      var nextPoint = { x: e.clientX, y: toSimY(e.clientY) };
      var lastPoint = pts[pts.length - 1];
      if (lastPoint && lastPoint.x === nextPoint.x && lastPoint.y === nextPoint.y) return;

      var candidate = pts.concat([nextPoint]);
      if (candidate.length > 2 && polygonArea(candidate) > maxArea) return;

      pts.push(nextPoint);
      if (pts.length % 3 === 0) setDrawPoints(pts.slice());
    }

    function onUp() {
      if (!drawing) return;
      drawing = false;
      if (pts.length > 10) {
        if (!aspectRatioOk(pts, 4)) {
          setRatioWarn('Sector geometry rejected: aspect ratio exceeds tolerance.');
          setTimeout(function() { setRatioWarn(false); }, 2500);
        } else {
          var cx = 0, cy = 0;
          for (var i = 0; i < pts.length; i++) { cx += pts[i].x; cy += pts[i].y; }
          cx = Math.round(cx / pts.length); cy = Math.round(cy / pts.length);
          var newZ = { id: _zoneId++, points: pts.slice(), center: { x: cx, y: cy }, capacity: 5000, maxConcurrent: 100, active: 0 };
          setRadarZones(function(p) { return p.concat([newZ]); });
        }
      }
      setDrawPoints([]);
    }

    document.addEventListener('mousedown', onDown);
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
    return function() { document.removeEventListener('mousedown', onDown); document.removeEventListener('mousemove', onMove); document.removeEventListener('mouseup', onUp); };
  }, [isDrawing]);

  // ?寃?紐⑤뱶 ??3D 酉곗뿉???대┃?쇰줈 誘몄궗??諛쒖궗 (raycasting)
  useEffect(function() {
    if (!targetMode || activeView !== '3d') return;
    var raycaster = new THREE.Raycaster();
    var mouse = new THREE.Vector2();
    function onClick(e) {
      if (e.target.closest('[data-action]')) return;
      if (!e.target.closest('[data-3d]')) return;
      if (!_threeRenderer || !_threeCamera || !_threeScene) return;

      // 留덉슦????NDC 醫뚰몴
      var rect = _threeRenderer.domElement.getBoundingClientRect();
      mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      // Raycasting ??諛붾떏 ?됰㈃(y=0)怨?援먯감??
      raycaster.setFromCamera(mouse, _threeCamera);
      var groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
      var hitPoint = new THREE.Vector3();
      raycaster.ray.intersectPlane(groundPlane, hitPoint);
      if (!hitPoint) return;

      // 3D ?붾뱶 醫뚰몴 ??2D ?쎌? 醫뚰몴濡??????
      var w = window.innerWidth, h = window.innerHeight - SIM_TOP - SIM_BOTTOM;
      var tx = (hitPoint.x / (1200 / w)) + w / 2;
      var ty = (hitPoint.z / (1200 / h)) + h / 2;
      tx = Math.max(0, Math.min(w, Math.round(tx)));
      ty = Math.max(0, Math.min(h, Math.round(ty)));

      // 3D???寃?留덉빱 異붽?
      var markerGeo = new THREE.CylinderGeometry(0, 12, 30, 4);
      var markerMat = new THREE.MeshBasicMaterial({ color: 0xff4444, transparent: true, opacity: 0.8 });
      var marker = new THREE.Mesh(markerGeo, markerMat);
      marker.position.set(hitPoint.x, 15, hitPoint.z);
      _threeScene.add(marker);
      // 留덉빱 ?먮룞 ?쒓굅
      setTimeout(function() { if (_threeScene) _threeScene.remove(marker); }, 3000);

      // 2D ?곗씠?곗뿉 ?寃?+ 誘몄궗??異붽?
      setTargets(function(p) { return p.concat([{ x: tx, y: ty }]); });
      var newMs = [];
      for (var i = 0; i < 20; i++) {
        var sp = randomEdgePos(tx, ty, w, h);
        newMs.push({ id: _missileId++, x: sp.x, y: sp.y, targetX: tx, targetY: ty, active: true, intercepted: false });
      }
      setTotalAttacks(function(n) { return n + newMs.length; });
      setMissiles(function(p) { return p.concat(newMs); });
    }
    document.addEventListener('click', onClick);
    return function() { document.removeEventListener('click', onClick); };
  }, [targetMode, activeView]);

  // ?? ?꾨룄誘몄궗???ㅽ룿 ?꾩튂 蹂댁젙: ?붾㈃ 理쒖긽???곗륫?먯꽌 ?섏쭅?숉븯 沅ㅼ쟻 ??
  function _ballisticSpawn(originId, originX, originY, targetX, targetY, w, h) {
    // ?붾㈃ ?곷떒 洹쇱쿂?먯꽌 吏꾩엯 (?붾㈃ 諛??덈Т 硫由?X)
    var topY = 10 + Math.random() * 30;
    // ?寃잙낫???쎄컙 ?ㅻⅨ履?(?숈そ?먯꽌 吏꾩엯)
    var topX = Math.min(w - 24, targetX + 40 + Math.random() * 60);
    return { x: topX, y: topY };
  }

  // ?? National: ?섎룞 怨듦꺽 ?⑥닔 ??
  function launchNatAttack(originId) {
    var origin = null;
    for (var i = 0; i < THREAT_ORIGINS.length; i++) {
      if (THREAT_ORIGINS[i].id === originId) { origin = THREAT_ORIGINS[i]; break; }
    }
    if (!origin) return;
    var w = window.innerWidth, h = window.innerHeight - SIM_TOP - SIM_BOTTOM;
    var sp = geoToScreen(origin.lon, origin.lat, w, h);
    sp.x = Math.max(30, Math.min(w - 30, sp.x));
    sp.y = Math.max(30, Math.min(h - 30, sp.y));
    // ?쒕뜡 ?꾩떆 1~2媛??좏깮
    var shuffled = DEFENSE_CITIES.slice().sort(function() { return Math.random() - 0.5; });
    var numCities = 1 + Math.floor(Math.random() * 2);
    var newMs = [];
    for (var ci = 0; ci < numCities && ci < shuffled.length; ci++) {
      var city = shuffled[ci];
      var cp = geoToScreen(city.lon, city.lat, w, h);
      var count = 3 + Math.floor(Math.random() * 5);
      var attackType = originId === 'iran' ? 'ballistic' : (originId === 'yemen' ? 'drone' : 'rocket');
      for (var mi = 0; mi < count; mi++) {
        var spreadX = (Math.random() - 0.5) * 20;
        var spreadY = (Math.random() - 0.5) * 20;
        var targetX = cp.x + spreadX, targetY = cp.y + spreadY;
        // ?꾨룄誘몄궗?쇱씠硫??ㅽ룿 ?꾩튂瑜??붾㈃ 理쒖긽?⑥쑝濡?蹂寃?
        var launchX = sp.x, launchY = sp.y;
        if (attackType === 'ballistic') {
          var bsp = _ballisticSpawn(originId, sp.x, sp.y, targetX, targetY, w, h);
          launchX = bsp.x; launchY = bsp.y;
        }
        newMs.push({
          id: _natMissileId++, sx: launchX, sy: launchY,
          x: launchX, y: launchY,
          targetX: targetX, targetY: targetY,
          targetCity: city.id, targetCityName: city.name,
          type: attackType,
          color: origin.color,
          active: true,
          speed: buildNationalMissileSpeed(launchX, launchY, targetX, targetY, attackType)
        });
      }
    }
    setNatMissiles(function(p) { return p.concat(newMs); });
  }

  // ?? National: ?쒕굹由ъ삤 ?ъ깮 ??
  function launchScenario(scenarioId) {
    var sc = SCENARIOS[scenarioId];
    if (!sc) return;
    setScenarioRunning(true);
    setNatMissiles([]);
    setAttackedCities([]);
    setScenarioElapsed(0);
    setScenarioIntercepted(0);
    setScenarioBreached(0);
    var w = window.innerWidth, h = window.innerHeight - SIM_TOP - SIM_BOTTOM;
    var timers = [];
    for (var wi = 0; wi < sc.waves.length; wi++) {
      (function(wave) {
        var tid = setTimeout(function() {
          var origin = null;
          for (var oi = 0; oi < THREAT_ORIGINS.length; oi++) {
            if (THREAT_ORIGINS[oi].id === wave.from) { origin = THREAT_ORIGINS[oi]; break; }
          }
          if (!origin) return;
          var sp = geoToScreen(origin.lon, origin.lat, w, h);
          sp.x = Math.max(30, Math.min(w - 30, sp.x));
          sp.y = Math.max(30, Math.min(h - 30, sp.y));
          var newMs = [];
          for (var ti = 0; ti < wave.targets.length; ti++) {
            var cityId = wave.targets[ti];
            var city = null;
            for (var ci = 0; ci < DEFENSE_CITIES.length; ci++) {
              if (DEFENSE_CITIES[ci].id === cityId) { city = DEFENSE_CITIES[ci]; break; }
            }
            if (!city) continue;
            var cp = geoToScreen(city.lon, city.lat, w, h);
            var perCity = Math.max(1, Math.round(wave.count / wave.targets.length));
            for (var mi = 0; mi < perCity; mi++) {
              var spawnX = sp.x + (Math.random() - 0.5) * 10;
              var spawnY = sp.y + (Math.random() - 0.5) * 10;
              var spreadX = (Math.random() - 0.5) * 20;
              var spreadY = (Math.random() - 0.5) * 20;
              var targetX = cp.x + spreadX, targetY = cp.y + spreadY;
              // ?꾨룄誘몄궗?쇱씠硫??붾㈃ 理쒖긽?⑥뿉???섏쭅?숉븯
              var launchSx = sp.x, launchSy = sp.y;
              if (wave.type === 'ballistic') {
                var bsp = _ballisticSpawn(wave.from, sp.x, sp.y, targetX, targetY, w, h);
                spawnX = bsp.x + (Math.random() - 0.5) * 10;
                spawnY = bsp.y + (Math.random() - 0.5) * 10;
                launchSx = bsp.x; launchSy = bsp.y;
              }
              newMs.push({
                id: _natMissileId++, sx: launchSx, sy: launchSy,
                x: spawnX, y: spawnY,
                targetX: targetX, targetY: targetY,
                targetCity: city.id, targetCityName: city.name,
                type: wave.type,
                color: origin.color,
                active: true,
                speed: buildNationalMissileSpeed(spawnX, spawnY, targetX, targetY, wave.type)
              });
            }
          }
          setNatMissiles(function(p) { return p.concat(newMs); });
        }, wave.time);
        timers.push(tid);
      })(sc.waves[wi]);
    }
    // ?쒕굹由ъ삤 醫낅즺 ??대㉧ ??留덉?留??⑥씠釉?+ ?ъ쑀 ???꾩쟾 ?뺣━
    var lastTime = sc.waves[sc.waves.length - 1].time;
    var endTid = setTimeout(function() {
      setScenarioRunning(false);
      setNatMissiles([]);
      setAttackedCities([]);
      var flashes = document.querySelectorAll('.screen-flash');
      for (var fi = 0; fi < flashes.length; fi++) {
        if (flashes[fi].parentNode) flashes[fi].parentNode.removeChild(flashes[fi]);
      }
      setActiveView('national');
      // multi3d ???꾨? ?뚭눼
      var sceneKeys = Object.keys(_multi3dScenes);
      for (var sk = 0; sk < sceneKeys.length; sk++) destroyMulti3dScene(sceneKeys[sk]);
      setMultiCities(null);
    }, lastTime + 9000);
    timers.push(endTid);
    _scenarioTimers = timers;
  }

  // ?? National 誘몄궗???좊땲硫붿씠??猷⑦봽 ??
  useEffect(function() {
    var animId, lastTs = 0;
    function natLoop(ts) {
      animId = requestAnimationFrame(natLoop);
      var dt = lastTs ? Math.min(0.05, (ts - lastTs) / 1000) : (1 / 60);
      lastTs = ts;
      setNatMissiles(function(prev) {
        if (prev.length === 0) return prev;
        var changed = false;
        var arrivedCities = {};
        var newMissiles = prev.map(function(m) {
          if (!m.active) return m;
          var dx = m.targetX - m.x, dy = m.targetY - m.y;
          var dist = Math.sqrt(dx * dx + dy * dy);
          var step = m.speed * dt;
          if (dist < Math.max(6, step)) {
            changed = true;
            arrivedCities[m.targetCity] = m.targetCityName;
            return Object.assign({}, m, { x: m.targetX, y: m.targetY, active: false });
          }
          changed = true;
          return Object.assign({}, m, {
            x: m.x + (dx / dist) * step,
            y: m.y + (dy / dist) * step
          });
        });
        var arrivedIds = Object.keys(arrivedCities);
        if (arrivedIds.length > 0) {
          // ?붽꺽/愿??移댁슫?????꾩갑??誘몄궗??以?諛⑷났援ъ뿭???우? 寃껋? ?붽꺽
          var intCount = 0, brCount = 0;
          var ballisticIntercepted = false;
          for (var ai = 0; ai < newMissiles.length; ai++) {
            var am = newMissiles[ai];
            if (am.active || !arrivedCities[am.targetCity]) continue;
            var wasIntercepted = false;
            for (var rz = 0; rz < _radarZones.length; rz++) {
              if (pointInPolygon(am.x, am.y, _radarZones[rz].points)) { wasIntercepted = true; break; }
            }
            if (wasIntercepted) {
              intCount++;
              if (am.type === 'ballistic') ballisticIntercepted = true;
            } else { brCount++; }
          }
          if (intCount > 0) setScenarioIntercepted(function(p) { return p + intCount; });
          if (brCount > 0) setScenarioBreached(function(p) { return p + brCount; });
          setAttackedCities(function(ac) {
            var updated = ac.slice();
            for (var i = 0; i < arrivedIds.length; i++) {
              if (updated.indexOf(arrivedIds[i]) < 0) updated.push(arrivedIds[i]);
            }
            return updated;
          });
        }
        newMissiles = newMissiles.filter(function(m) { return m.active; });
        return changed ? newMissiles : prev;
      });
    }
    animId = requestAnimationFrame(natLoop);
    return function() { cancelAnimationFrame(animId); };
  }, []);

  // ?쒖꽦 誘몄궗????
  var activeMissiles = useMemo(function() {
    return missiles.filter(function(m) { return m.active && !m.intercepted; }).length;
  }, [missiles]);

  var trackedThreatCities = useMemo(function() {
    var cityEta = {};
    for (var i = 0; i < natMissiles.length; i++) {
      var m = natMissiles[i];
      if (!m.active) continue;
      var dx = m.targetX - m.x, dy = m.targetY - m.y;
      var dist = Math.sqrt(dx * dx + dy * dy);
      var eta = dist / Math.max(1, m.speed || 1);
      var existing = cityEta[m.targetCity];
      if (!existing || eta < existing.eta) cityEta[m.targetCity] = { id: m.targetCity, eta: eta };
    }
    return Object.keys(cityEta).map(function(cityId) { return cityEta[cityId]; })
      .sort(function(a, b) { return a.eta - b.eta; });
  }, [natMissiles]);

  var trackedThreatCityIds = useMemo(function() {
    return trackedThreatCities.map(function(entry) { return entry.id; });
  }, [trackedThreatCities]);

  var imminentCities = useMemo(function() {
    var result = [];
    for (var i = 0; i < trackedThreatCities.length; i++) {
      if (trackedThreatCities[i].eta > NATIONAL_ZOOM_TRIGGER_SECONDS) continue;
      result.push(trackedThreatCities[i].id);
    }
    return result;
  }, [trackedThreatCities]);

  // ?? National: ?꾩떆 ?寃?吏곸쟾 癒쇱? multi3d ?뺣? ??
  useEffect(function() {
    if (activeView !== 'national' || imminentCities.length === 0) return;
    var delay = Math.max(0, multi3dCooldownUntil - Date.now());
    var tid = setTimeout(function() {
      var focusCities = buildCityFocusList(imminentCities, trackedThreatCityIds, 4);
      if (focusCities.length === 0) return;
      setMultiCities(function(prev) {
        var current = prev || [];
        return sameIdList(current, focusCities) ? prev : focusCities;
      });
      setActiveView('multi3d');
      setMulti3dSession(function(n) { return n + 1; });
    }, delay);
    return function() { clearTimeout(tid); };
  }, [imminentCities, trackedThreatCityIds, activeView, multi3dCooldownUntil]);

  // ?? Multi3D 以??ㅻⅨ ?꾩떆 ?꾪삊??遺숈쑝硫?媛숈? 遺꾪븷 ?붾㈃??怨꾩냽 異붽? ??
  useEffect(function() {
    if (activeView !== 'multi3d') return;
    var currentCities = multiCities || [];
    var nextCities = buildCityFocusList(currentCities, trackedThreatCityIds, 4);
    if (nextCities.length === 0 || sameIdList(currentCities, nextCities)) return;
    var shouldExtendSession = multi3dSession > 0 && nextCities.length > currentCities.length;
    setMultiCities(nextCities);
    if (shouldExtendSession) setMulti3dSession(function(n) { return n + 1; });
  }, [activeView, multiCities, trackedThreatCityIds, multi3dSession]);

  // ?? Multi3D 泥대쪟 ??national 蹂듦? ??
  useEffect(function() {
    if (activeView !== 'multi3d' || multi3dSession === 0) return;
    var tid = setTimeout(function() {
      setActiveView('national');
      setAttackedCities([]);
      setMulti3dCooldownUntil(Date.now() + NATIONAL_OVERVIEW_PAUSE_MS);
    }, MULTI3D_FOCUS_MS);
    return function() { clearTimeout(tid); };
  }, [activeView, multi3dSession]);

  var alertSirenActive = useMemo(function() {
    return natMissiles.length > 0 || activeMissiles > 0 || attackedCities.length > 0;
  }, [natMissiles, activeMissiles, attackedCities]);

  useEffect(function() {
    setAlertSirenActive(alertSirenActive);
  }, [alertSirenActive]);

  // 3D ??珥덇린???뚭눼
  useEffect(function() {
    if (activeView === '3d') {
      destroyThreeScene();
      setTimeout(function() {
        var container = document.querySelector('[data-3d]');
        if (container) initThreeScene(container, selectedSimCityId);
        // ???앹꽦 吏곹썑 湲곗〈 ?곗씠??利됱떆 ?숆린??
        syncThreeZones(_radarZones);
        syncThreeMissiles(missiles);
        syncThreeBreaches(breaches);
      }, 50);
    } else {
      destroyThreeScene();
    }
  }, [activeView, selectedSimCityId]);

  // 3D ?ㅼ떆媛??숆린????2D ?곗씠?곕? 洹몃?濡?3D??諛섏쁺
  useEffect(function() {
    if (activeView !== '3d' || !_threeScene) return;
    syncThreeZones(radarZones);
    syncThreeMissiles(missiles);
    syncThreeBreaches(breaches);
  }, [radarZones, missiles, breaches]);

  // ?? Multi3D 酉?珥덇린???뚭눼 ??
  useEffect(function() {
    if (activeView !== 'multi3d' || !multiCities || multiCities.length === 0) {
      var keys = Object.keys(_multi3dScenes);
      for (var i = 0; i < keys.length; i++) destroyMulti3dScene(keys[i]);
      return;
    }
    var retryCount = 0;
    var maxRetries = 5;
    var cancelled = false;
    function tryInit() {
      if (cancelled) return;
      var wanted = {};
      for (var ci = 0; ci < multiCities.length; ci++) wanted[multiCities[ci]] = true;
      var keys = Object.keys(_multi3dScenes);
      for (var i = 0; i < keys.length; i++) {
        if (!wanted[keys[i]]) destroyMulti3dScene(keys[i]);
      }
      var pendingCities = [];
      for (var ci = 0; ci < multiCities.length; ci++) {
        var cid = multiCities[ci];
        var el = document.querySelector('[data-multi3d-cell="' + cid + '"]');
        var cityZones = getMulti3dZonesForCity(cid);
        var zoneSignature = buildZoneSignature(cityZones);
        if (_multi3dScenes[cid] && _multi3dScenes[cid].zoneSignature !== zoneSignature) {
          destroyMulti3dScene(cid);
        }
        if (!_multi3dScenes[cid]) {
          if (el && el.clientWidth > 10 && el.clientHeight > 10) {
            initMulti3dScene(cid, el, cityZones);
          } else {
            pendingCities.push(cid);
          }
        }
      }
      // Retry for cities whose cells don't have dimensions yet
      if (pendingCities.length > 0 && retryCount < maxRetries) {
        retryCount++;
        setTimeout(tryInit, 150);
      }
    }
    var tid = setTimeout(tryInit, 120);
    return function() { cancelled = true; clearTimeout(tid); };
  }, [activeView, multiCities, simCityStore, selectedSimCityId, radarZones]);

  // VNode ?몃━
  var multi3dCells = [];
  if (multiCities && multiCities.length > 0) {
    for (var mci = 0; mci < multiCities.length; mci++) {
      var mcId = multiCities[mci];
      var mcName = '';
      for (var mni = 0; mni < DEFENSE_CITIES.length; mni++) {
        if (DEFENSE_CITIES[mni].id === mcId) { mcName = DEFENSE_CITIES[mni].name; break; }
      }
      multi3dCells.push(createVNode('div', { class: 'multi-3d-cell', 'data-multi3d-cell': mcId }, [
        createVNode('div', { class: 'city-3d-label' }, [createTextVNode(mcName)])
      ]));
    }
  }
  var splitClass = 'multi-3d split-' + Math.min(4, (multiCities || []).length);
  if (activeView !== 'multi3d') splitClass += ' hidden';

  return createVNode('div', { class: 'app' }, [
    TopBar({ activeView: activeView, isDrawing: isDrawing, targetMode: targetMode, simCityName: selectedSimCity.name }),
    createVNode('div', { class: 'alert-frame' + (alertSirenActive ? '' : ' hidden') }, []),
    NationalView({ visible: activeView === 'national', natMissiles: natMissiles, scenarioRunning: scenarioRunning, scenarioElapsed: scenarioElapsed, scenarioIntercepted: scenarioIntercepted, scenarioBreached: scenarioBreached }),
    SimView({
      dronePos: dronePos, droneAlive: droneAlive, droneAngle: droneAngle,
      radarZones: radarZones, isDrawing: isDrawing, drawPoints: drawPoints, cityId: selectedSimCity.id, cityName: selectedSimCity.name,
      interceptPos: interceptPos, visible: activeView === 'sim',
      missiles: missiles, breaches: breaches, targets: targets,
      vulnPoints: vulnPoints, targetMode: targetMode, interceptors: interceptors
    }),
    CitySelector({ activeView: activeView, cityId: selectedSimCity.id, cityName: selectedSimCity.name }),
    createVNode('div', { class: splitClass }, multi3dCells),
    View3D({ visible: activeView === '3d', activeMissiles: activeMissiles, radarZones: radarZones, breachCount: breaches.length, targetMode: targetMode, totalAttacks: totalAttacks, currentTimeLabel: currentTimeLabel, cityName: selectedSimCity.name }),
    TestView({ results: testResults, visible: activeView === 'test' }),
    BriefingView({ visible: activeView === 'briefing', cityCount: DEFENSE_CITIES.length, scenarioCount: SCENARIOS.length, testCount: testResults.length }),
    InfoPanel({ activeView: activeView, radarZones: radarZones, breachCount: breaches.length, activeMissiles: activeMissiles, totalAttacks: totalAttacks, currentTimeLabel: currentTimeLabel, cityName: selectedSimCity.name }),
    StatusBar({
      droneAlive: droneAlive, zoneCount: radarZones.length, isDrawing: isDrawing, cityName: selectedSimCity.name,
      targetMode: targetMode, totalArea: totalArea, activeView: activeView,
      activeMissiles: activeMissiles, totalAttacks: totalAttacks, currentTimeLabel: currentTimeLabel
    }),
    DrawHint({ isDrawing: isDrawing, activeView: activeView, ratioWarn: ratioWarn }),
    ControlsHelp({ activeView: activeView })
  ]);
}

// ?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧
// SECTION 10: INIT
// ?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧
var root = new FunctionComponent(App, {});
root.mount(document.getElementById('root'));

