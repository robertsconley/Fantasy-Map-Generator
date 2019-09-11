// Fantasy Map Generator main script
// Azgaar (azgaar.fmg@yandex.by). Minsk, 2017-2019
// https://github.com/Azgaar/Fantasy-Map-Generator
// MIT License

// I don't mind of any help with programming.
// See also https://github.com/Azgaar/Fantasy-Map-Generator/issues/153

"use strict";
const version = "1.0"; // generator version
document.title += " v" + version;

// if map version is not stored, clear localStorage and show a message
if (localStorage.getItem("version") != version) {
  localStorage.clear();
  setTimeout(showWelcomeMessage, 8000);
}

// append svg layers (in default order)
let svg = d3.select("#map");
let defs = svg.select("#deftemp");
let viewbox = svg.select("#viewbox");
let scaleBar = svg.select("#scaleBar");
let legend = svg.append("g").attr("id", "legend");
let ocean = viewbox.append("g").attr("id", "ocean");
let oceanLayers = ocean.append("g").attr("id", "oceanLayers");
let oceanPattern = ocean.append("g").attr("id", "oceanPattern");
let lakes = viewbox.append("g").attr("id", "lakes");
let landmass = viewbox.append("g").attr("id", "landmass");
let texture = viewbox.append("g").attr("id", "texture");
let terrs = viewbox.append("g").attr("id", "terrs");
let biomes = viewbox.append("g").attr("id", "biomes");
let cells = viewbox.append("g").attr("id", "cells");
let gridOverlay = viewbox.append("g").attr("id", "gridOverlay");
let coordinates = viewbox.append("g").attr("id", "coordinates");
let compass = viewbox.append("g").attr("id", "compass");
let rivers = viewbox.append("g").attr("id", "rivers");
let terrain = viewbox.append("g").attr("id", "terrain");
let relig = viewbox.append("g").attr("id", "relig");
let cults = viewbox.append("g").attr("id", "cults");
let regions = viewbox.append("g").attr("id", "regions");
let statesBody = regions.append("g").attr("id", "statesBody");
let statesHalo = regions.append("g").attr("id", "statesHalo");
let provs = viewbox.append("g").attr("id", "provs");
let zones = viewbox.append("g").attr("id", "zones").attr("display", "none");
let borders = viewbox.append("g").attr("id", "borders");
let stateBorders = borders.append("g").attr("id", "stateBorders");
let provinceBorders = borders.append("g").attr("id", "provinceBorders");
let routes = viewbox.append("g").attr("id", "routes");
let roads = routes.append("g").attr("id", "roads");
let trails = routes.append("g").attr("id", "trails");
let searoutes = routes.append("g").attr("id", "searoutes");
let temperature = viewbox.append("g").attr("id", "temperature");
let coastline = viewbox.append("g").attr("id", "coastline");
let prec = viewbox.append("g").attr("id", "prec").attr("display", "none");
let population = viewbox.append("g").attr("id", "population");
let labels = viewbox.append("g").attr("id", "labels");
let icons = viewbox.append("g").attr("id", "icons");
let burgIcons = icons.append("g").attr("id", "burgIcons");
let anchors = icons.append("g").attr("id", "anchors");
let markers = viewbox.append("g").attr("id", "markers").attr("display", "none");
let fogging = viewbox.append("g").attr("id", "fogging-cont").attr("mask", "url(#fog)")
  .append("g").attr("id", "fogging").attr("display", "none");
let ruler = viewbox.append("g").attr("id", "ruler").attr("display", "none");
let debug = viewbox.append("g").attr("id", "debug");

let freshwater = lakes.append("g").attr("id", "freshwater");
let salt = lakes.append("g").attr("id", "salt");

labels.append("g").attr("id", "states");
labels.append("g").attr("id", "addedLabels");

let burgLabels = labels.append("g").attr("id", "burgLabels");
burgIcons.append("g").attr("id", "cities");
burgLabels.append("g").attr("id", "cities");
anchors.append("g").attr("id", "cities");

burgIcons.append("g").attr("id", "towns");
burgLabels.append("g").attr("id", "towns");
anchors.append("g").attr("id", "towns");

// population groups
population.append("g").attr("id", "rural");
population.append("g").attr("id", "urban");

// fogging
fogging.append("rect").attr("x", 0).attr("y", 0).attr("width", "100%").attr("height", "100%");

// assign events separately as not a viewbox child
scaleBar.on("mousemove", () => tip("Click to open Units Editor"));
legend.on("mousemove", () => tip("Drag to change the position. Click to hide the legend")).on("click", () => clearLegend());

// main data variables
let grid = {}; // initial grapg based on jittered square grid and data
let pack = {}; // packed graph and data
let seed, mapHistory = [], elSelected, modules = {}, notes = [];
let customization = 0; // 0 - no; 1 = heightmap draw; 2 - states draw; 3 - add state/burg; 4 - cultures draw
let mapCoordinates = {}; // map coordinates on globe
let winds = [225, 45, 225, 315, 135, 315]; // default wind directions
let biomesData = applyDefaultBiomesSystem();
let nameBases = Names.getNameBases(), nameBase = Names.getNameBase(); // cultures-related data
const fonts = ["Almendra+SC", "Georgia", "Arial", "Times+New+Roman", "Comic+Sans+MS", "Lucida+Sans+Unicode", "Courier+New"]; // default web-safe fonts

let color = d3.scaleSequential(d3.interpolateSpectral); // default color scheme
const lineGen = d3.line().curve(d3.curveBasis); // d3 line generator with default curve interpolation

// d3 zoom behavior
let scale = 1, viewX = 0, viewY = 0;
const zoom = d3.zoom().scaleExtent([1, 20]).on("zoom", zoomed);

applyStoredOptions();
let graphWidth = +mapWidthInput.value; // voronoi graph extention, should be stable for each map
let graphHeight = +mapHeightInput.value;
let svgWidth = graphWidth, svgHeight = graphHeight; // svg canvas resolution, can vary for each map
landmass.append("rect").attr("x", 0).attr("y", 0).attr("width", graphWidth).attr("height", graphHeight);
oceanPattern.append("rect").attr("fill", "url(#oceanic)").attr("x", 0).attr("y", 0).attr("width", graphWidth).attr("height", graphHeight);
oceanLayers.append("rect").attr("id", "oceanBase").attr("x", 0).attr("y", 0).attr("width", graphWidth).attr("height", graphHeight);

void function removeLoading() {
  d3.select("#loading").transition().duration(5000).style("opacity", 0).remove();
  d3.select("#initial").transition().duration(5000).attr("opacity", 0).remove();
  d3.select("#optionsContainer").transition().duration(3000).style("opacity", 1);
  d3.select("#tooltip").transition().duration(3000).style("opacity", 1);
}()

// decide which map should be loaded or generated on page load
void function checkLoadParameters() {
  const url = new URL(window.location.href);
  const params = url.searchParams;

  // of there is a valid maplink, try to load .map file from URL
  if (params.get("maplink")) {
    console.warn("Load map from URL");
    const maplink = params.get("maplink");
    const pattern = /(ftp|http|https):\/\/(\w+:{0,1}\w*@)?(\S+)(:[0-9]+)?(\/|\/([\w#!:.?+=&%@!\-\/]))?/;
    const valid = pattern.test(maplink);
    if (valid) {loadMapFromURL(maplink, 1); return;}
    else showUploadErrorMessage("Map link is not a valid URL", maplink);
  }

  // if there is a seed (user of MFCG provided), generate map for it
  if (params.get("seed")) {
    console.warn("Generate map for seed");
    generateMapOnLoad();
    return;
  }

  // open latest map if option is active and map is stored
  if (onloadMap.value === "saved") {
    ldb.get("lastMap", blob => {
      if (blob) {
        console.warn("Load last saved map");
        try {
          uploadFile(blob);
        }
        catch(error) {
          console.error(error);
          console.warn("Cannot load stored map, random map to be generated");
          generateMapOnLoad();
        }
      } else {
        console.error("No map stored, random map to be generated");
        generateMapOnLoad();
      }
    });
    return;
  }

  console.warn("Generate random map");
  generateMapOnLoad();
}()

function loadMapFromURL(maplink, random) {
  const URL = decodeURIComponent(maplink);

  fetch(URL, {method: 'GET', mode: 'cors'})
    .then(response => {
      if(response.ok) return response.blob();
      throw new Error("Cannot load map from URL");
    }).then(blob => uploadFile(blob))
    .catch(error => {
      showUploadErrorMessage(error.message, URL, random);
      if (random) generateMapOnLoad();
    });
}

function showUploadErrorMessage(error, URL, random) {
  console.error(error);
  alertMessage.innerHTML = `
    Cannot load map from the <a href='${URL}' target='_blank'>link provided</a>.
    ${random?`A new random map is generated. `:''}
    Please ensure the linked file is reachable and CORS is allowed on server side`;
  $("#alert").dialog({title: "Loading error", width: 320, buttons: {OK: function() {$(this).dialog("close");}}});
}

function generateMapOnLoad() {
  applyDefaultStyle(); // apply style
  generate(); // generate map
  focusOn(); // based on searchParams focus on point, cell or burg from MFCG
  applyPreset(); // apply saved layers preset
}

// focus on coordinates, cell or burg provided in searchParams
function focusOn() {
  const url = new URL(window.location.href);
  const params = url.searchParams;

  if (params.get("from") === "MFCG") {
    if (params.get("seed").length === 13) {
      // show back burg from MFCG
      params.set("burg", params.get("seed").slice(-4));
    } else {
      // select burg for MFCG
      findBurgForMFCG(params);
      return;
    }
  }

  const s = +params.get("scale") || 8;
  let x = +params.get("x");
  let y = +params.get("y");

  const c = +params.get("cell");
  if (c) {
    x = pack.cells.p[c][0];
    y = pack.cells.p[c][1];
  }

  const b = +params.get("burg");
  if (b && pack.burgs[b]) {
    x = pack.burgs[b].x;
    y = pack.burgs[b].y;
  }

  if (x && y) zoomTo(x, y, s, 1600);
}

// find burg for MFCG and focus on it
function findBurgForMFCG(params) {
  const cells = pack.cells, burgs = pack.burgs;
  if (pack.burgs.length < 2) {console.error("Cannot select a burg for MFCG"); return;}

  const size = +params.get("size");
  const name = params.get("name");
  let coast = +params.get("coast");
  let port = +params.get("port");
  let river = +params.get("river");

  let selection = defineSelection(coast, port, river);
  if (!selection.length) selection = defineSelection(coast, !port, !river);
  if (!selection.length) selection = defineSelection(!coast, 0, !river);
  if (!selection.length) selection = [burgs[1]]; // select first if nothing is found

  function defineSelection(coast, port, river) {
    if (port && river) return burgs.filter(b => b.port && cells.r[b.cell]);
    if (!port && coast && river) return burgs.filter(b => !b.port && cells.t[b.cell] === 1 && cells.r[b.cell]);
    if (!coast && !river) return burgs.filter(b => cells.t[b.cell] !== 1 && !cells.r[b.cell]);
    if (!coast && river) return burgs.filter(b => cells.t[b.cell] !== 1 && cells.r[b.cell]);
    if (coast && river) return burgs.filter(b => cells.t[b.cell] === 1 && cells.r[b.cell]);
    return [];
  }

  // select a burg with closest population from selection
  const selected = d3.scan(selection, (a, b) => Math.abs(a.population - size) - Math.abs(b.population - size));
  const b = selection[selected].i;
  if (!b) {console.error("Cannot select a burg for MFCG"); return;}
  if (size) burgs[b].population = size;
  if (name) burgs[b].name = name;

  const label = burgLabels.select("[data-id='" + b + "']");
  if (label.size()) {
    tip("Here stands the glorious city of " + burgs[b].name, true, "success", 12000);
    label.text(burgs[b].name).classed("drag", true).on("mouseover", function() {
      d3.select(this).classed("drag", false);
      label.on("mouseover", null);
    });
  }

  zoomTo(burgs[b].x, burgs[b].y, 8, 1600);
  invokeActiveZooming();
}

// apply default biomes data
function applyDefaultBiomesSystem() {
  const name = ["Marine","Hot desert","Cold desert","Savanna","Grassland","Tropical seasonal forest","Temperate deciduous forest","Tropical rainforest","Temperate rainforest","Taiga","Tundra","Glacier","Wetland"];
  const color = ["#53679f","#fbe79f","#b5b887","#d2d082","#c8d68f","#b6d95d","#29bc56","#7dcb35","#409c43","#4b6b32","#96784b","#d5e7eb","#0b9131"];
  const habitability = [0,2,5,20,30,50,100,80,90,10,2,0,12];
  const iconsDensity = [0,3,2,120,120,120,120,150,150,100,5,0,150];
  const icons = [{},{dune:3, cactus:6, deadTree:1},{dune:9, deadTree:1},{acacia:1, grass:9},{grass:1},{acacia:8, palm:1},{deciduous:1},{acacia:5, palm:3, deciduous:1, swamp:1},{deciduous:6, swamp:1},{conifer:1},{grass:1},{},{swamp:1}];
  const cost = [10,200,150,60,50,70,70,80,90,80,100,255,150]; // biome movement cost
  const biomesMartix = [
    // hot ↔ cold; dry ↕ wet
    new Uint8Array([1,1,1,1,1,1,1,1,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2]),
    new Uint8Array([3,3,3,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,9,9,9,9,9,10,10]),
    new Uint8Array([5,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,9,9,9,9,9,10,10,10]),
    new Uint8Array([5,6,6,6,6,6,6,8,8,8,8,8,8,8,8,8,8,9,9,9,9,9,9,10,10,10]),
    new Uint8Array([7,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,9,9,9,9,9,9,10,10,10])
  ];

  // parse icons weighted array into a simple array
  for (let i=0; i < icons.length; i++) {
    const parsed = [];
    for (const icon in icons[i]) {
      for (let j = 0; j < icons[i][icon]; j++) {parsed.push(icon);}
    }
    icons[i] = parsed;
  }

  return {i:d3.range(0, name.length), name, color, biomesMartix, habitability, iconsDensity, icons, cost};
}

// restore initial style
function applyDefaultStyle() {
  biomes.attr("opacity", null).attr("filter", null);
  stateBorders.attr("opacity", .8).attr("stroke", "#56566d").attr("stroke-width", 1).attr("stroke-dasharray", "2").attr("stroke-linecap", "butt").attr("filter", null);
  provinceBorders.attr("opacity", .8).attr("stroke", "#56566d").attr("stroke-width", .2).attr("stroke-dasharray", "1").attr("stroke-linecap", "butt").attr("filter", null);
  cells.attr("opacity", null).attr("stroke", "#808080").attr("stroke-width", .1).attr("filter", null).attr("mask", null);

  gridOverlay.attr("opacity", .8).attr("stroke", "#808080").attr("stroke-width", .5).attr("stroke-dasharray", null).attr("transform", null).attr("filter", null).attr("mask", null);
  coordinates.attr("opacity", 1).attr("data-size", 12).attr("font-size", 12).attr("stroke", "#d4d4d4").attr("stroke-width", 1).attr("stroke-dasharray", 5).attr("filter", null).attr("mask", null);
  compass.attr("opacity", .8).attr("transform", null).attr("filter", null).attr("mask", "url(#water)").attr("shape-rendering", "optimizespeed");
  if (!d3.select("#initial").size()) d3.select("#rose").attr("transform", "translate(80 80) scale(.25)");

  coastline.attr("opacity", .5).attr("stroke", "#1f3846").attr("stroke-width", .7).attr("filter", "url(#dropShadow)");
  styleCoastlineAuto.checked = true;
  relig.attr("opacity", .7).attr("stroke", "#404040").attr("stroke-width", .7).attr("filter", null).attr("fill-rule", "evenodd");
  cults.attr("opacity", .6).attr("stroke", "#777777").attr("stroke-width", .5).attr("filter", null).attr("fill-rule", "evenodd");
  icons.selectAll("g").attr("opacity", null).attr("fill", "#ffffff").attr("stroke", "#3e3e4b").attr("filter", null).attr("mask", null);
  landmass.attr("opacity", 1).attr("fill", "#eef6fb").attr("filter", null);
  markers.attr("opacity", null).attr("filter", "url(#dropShadow01)");
  styleRescaleMarkers.checked = true;
  prec.attr("opacity", null).attr("stroke", "#000000").attr("stroke-width", .1).attr("fill", "#003dff").attr("filter", null);
  population.attr("opacity", null).attr("stroke-width", 1.6).attr("stroke-dasharray", null).attr("stroke-linecap", "butt").attr("filter", null);
  population.select("#rural").attr("stroke", "#0000ff");
  population.select("#urban").attr("stroke", "#ff0000");

  freshwater.attr("opacity", .5).attr("fill", "#a6c1fd").attr("stroke", "#5f799d").attr("stroke-width", .7).attr("filter", null);
  salt.attr("opacity", .5).attr("fill", "#409b8a").attr("stroke", "#388985").attr("stroke-width", .7).attr("filter", null);

  terrain.attr("opacity", null).attr("filter", null).attr("mask", null);
  rivers.attr("opacity", null).attr("fill", "#5d97bb").attr("filter", null);
  roads.attr("opacity", .9).attr("stroke", "#d06324").attr("stroke-width", .7).attr("stroke-dasharray", "2").attr("stroke-linecap", "butt").attr("filter", null);
  ruler.attr("opacity", null).attr("filter", null);
  searoutes.attr("opacity", .8).attr("stroke", "#ffffff").attr("stroke-width", .45).attr("stroke-dasharray", "1 2").attr("stroke-linecap", "round").attr("filter", null);

  regions.attr("opacity", .4).attr("filter", null);
  statesHalo.attr("stroke-width", 10).attr("opacity", 1);
  provs.attr("opacity", .6).attr("filter", null);

  temperature.attr("opacity", null).attr("fill", "#000000").attr("stroke-width", 1.8).attr("fill-opacity", .3).attr("font-size", "8px").attr("stroke-dasharray", null).attr("filter", null).attr("mask", null);
  texture.attr("opacity", null).attr("filter", null).attr("mask", "url(#land)");
  texture.select("image").attr("x", 0).attr("y", 0);
  zones.attr("opacity", .6).attr("stroke", "#333333").attr("stroke-width", 0).attr("stroke-dasharray", null).attr("stroke-linecap", "butt").attr("filter", null).attr("mask", null);
  trails.attr("opacity", .9).attr("stroke", "#d06324").attr("stroke-width", .25).attr("stroke-dasharray", ".8 1.6").attr("stroke-linecap", "butt").attr("filter", null);

  // ocean and svg default style
  svg.attr("background-color", "#000000").attr("filter", null);
  const mapFilter = document.querySelector("#mapFilters .pressed");
  if (mapFilter) mapFilter.classList.remove("pressed");
  ocean.attr("opacity", null);
  oceanLayers.select("rect").attr("fill", "#53679f");
  oceanLayers.attr("filter", null);
  oceanPattern.attr("opacity", null);
  oceanLayers.selectAll("path").attr("display", null);
  styleOceanPattern.value = "url(#pattern1)";
  svg.select("#oceanic rect").attr("filter", "url(#pattern1)");

  // heightmap style
  terrs.attr("opacity", null).attr("filter", null).attr("mask", "url(#land)").attr("stroke", "none");
  const changed = styleHeightmapSchemeInput.value !== "bright" ||
                  styleHeightmapTerracingInput.value != 0 ||
                  styleHeightmapSkipInput.value != 5 ||
                  styleHeightmapSimplificationInput.value != 0 ||
                  styleHeightmapCurveInput.value != 0;
  styleHeightmapSchemeInput.value = "bright";
  styleHeightmapTerracingInput.value = styleHeightmapTerracingOutput.value = 0;
  styleHeightmapSkipInput.value = styleHeightmapSkipOutput.value = 5;
  styleHeightmapSimplificationInput.value = styleHeightmapSimplificationOutput.value = 0;
  styleHeightmapCurveInput.value = 0;
  if (changed) drawHeightmap();

  // legend
  legend.attr("font-family", "Almendra SC").attr("data-font", "Almendra+SC").attr("font-size", 13).attr("data-size", 13).attr("data-x", 99).attr("data-y", 93).attr("stroke-width", 2.5).attr("stroke", "#812929").attr("stroke-dasharray", "0 4 10 4").attr("stroke-linecap", "round");
  styleLegendBack.value = "#ffffff";
  styleLegendOpacity.value = styleLegendOpacityOutput.value = .8;
  styleLegendColItems.value = styleLegendColItemsOutput.value = 8;
  if (legend.selectAll("*").size() && window.redrawLegend) redrawLegend();

  const citiesSize = Math.max(rn(8 - regionsInput.value / 20), 3);
  burgLabels.select("#cities").attr("fill", "#3e3e4b").attr("opacity", 1).attr("font-family", "Almendra SC").attr("data-font", "Almendra+SC").attr("font-size", citiesSize).attr("data-size", citiesSize);
  burgIcons.select("#cities").attr("opacity", 1).attr("size", 1).attr("stroke-width", .24).attr("fill", "#ffffff").attr("stroke", "#3e3e4b").attr("fill-opacity", .7).attr("stroke-dasharray", "").attr("stroke-linecap", "butt");
  anchors.select("#cities").attr("opacity", 1).attr("fill", "#ffffff").attr("stroke", "#3e3e4b").attr("stroke-width", 1.2).attr("size", 2);

  burgLabels.select("#towns").attr("fill", "#3e3e4b").attr("opacity", 1).attr("font-family", "Almendra SC").attr("data-font", "Almendra+SC").attr("font-size", 3).attr("data-size", 4);
  burgIcons.select("#towns").attr("opacity", 1).attr("size", .5).attr("stroke-width", .12).attr("fill", "#ffffff").attr("stroke", "#3e3e4b").attr("fill-opacity", .7).attr("stroke-dasharray", "").attr("stroke-linecap", "butt");
  anchors.select("#towns").attr("opacity", 1).attr("fill", "#ffffff").attr("stroke", "#3e3e4b").attr("stroke-width", 1.2).attr("size", 1);

  const stateLabelSize = Math.max(rn(24 - regionsInput.value / 6), 6);
  labels.select("#states").attr("fill", "#3e3e4b").attr("opacity", 1).attr("stroke", "#3a3a3a").attr("stroke-width", 0).attr("font-family", "Almendra SC").attr("data-font", "Almendra+SC").attr("font-size", stateLabelSize).attr("data-size", stateLabelSize).attr("filter", null);
  labels.select("#addedLabels").attr("fill", "#3e3e4b").attr("opacity", 1).attr("stroke", "#3a3a3a").attr("stroke-width", 0).attr("font-family", "Almendra SC").attr("data-font", "Almendra+SC").attr("font-size", 18).attr("data-size", 18).attr("filter", null);
  invokeActiveZooming();

  fogging.attr("opacity", .8).attr("fill", "#000000").attr("stroke-width", 5);
}

function showWelcomeMessage() {
  const link = 'https://www.reddit.com/r/FantasyMapGenerator/comments/cxu1c5/update_new_version_is_published_v_10'; // announcement on Reddit
  alertMessage.innerHTML = `The Fantasy Map Generator is updated up to version <b>${version}</b>.

    This version is compatible with versions 0.8b and 0.9b, but not with older .map files.
    Please use an <a href='https://github.com/Azgaar/Fantasy-Map-Generator/wiki/Changelog' target='_blank'>archived version</a> to open old files.

    <ul><a href=${link} target='_blank'>Main changes:</a>
      <li>Provinces and Provinces Editor</li>
      <li>Religions Layer and Religions Editor</li>
      <li>Full state names (state types)</li>
      <li>Multi-lined labels</li>
      <li>State relations (diplomacy)</li>
      <li>Custom layers (zones)</li>
      <li>Places of interest (auto-added markers)</li>
      <li>New color picker and hatching fill</li>
      <li>Legend boxes</li>
      <li>World Configurator presets</li>
      <li>Improved state labels placement</li>
      <li>Relief icons sets</li>
      <li>Fogging</li>
      <li>Custom layer presets</li>
      <li>Custom biomes</li>
      <li>State, province and burg COAs</li>
      <li>Desktop version (see <a href='https://github.com/Azgaar/Fantasy-Map-Generator/wiki/Q&A#is-there-a-desktop-version' target='_blank'>here)</a></li>
    </ul>

    <p>Join our <a href='https://www.reddit.com/r/FantasyMapGenerator' target='_blank'>Reddit community</a> and
    <a href='https://discordapp.com/invite/X7E84HU' target='_blank'>Discord server</a>
    to ask questions, share maps, discuss the Generator, report bugs and propose new features.</p>

    <p>Thanks for all supporters on <a href='https://www.patreon.com/azgaar' target='_blank'>Patreon</a>!</i></p>`;

  $("#alert").dialog(
    {resizable: false, title: "Fantasy Map Generator update", width: 310,
    buttons: {OK: function() {$(this).dialog("close")}},
    position: {my: "center", at: "center", of: "svg"},
    close: () => localStorage.setItem("version", version)}
  );
}

function zoomed() {
  const transform = d3.event.transform;
  const scaleDiff = scale - transform.k;
  const positionDiff = viewX - transform.x | viewY - transform.y;
  scale = transform.k;
  viewX = transform.x;
  viewY = transform.y;
  viewbox.attr("transform", transform);

  // update grid only if view position
  if (positionDiff) drawCoordinates();

  // rescale only if zoom is changed
  if (scaleDiff) {
    invokeActiveZooming();
    drawScaleBar();
  }
}

// Zoom to a specific point
function zoomTo(x, y, z = 8, d = 2000) {
  const transform = d3.zoomIdentity.translate(x * -z + graphWidth / 2, y * -z + graphHeight / 2).scale(z);
  svg.transition().duration(d).call(zoom.transform, transform);
}

// Reset zoom to initial
function resetZoom(d = 1000) {
  svg.transition().duration(d).call(zoom.transform, d3.zoomIdentity);
}

// calculate x,y extreme points of viewBox
function getViewBoxExtent() {
  // x = trX / scale * -1 + graphWidth / scale
  // y = trY / scale * -1 + graphHeight / scale
  return [[Math.abs(viewX / scale), Math.abs(viewY / scale)], [Math.abs(viewX / scale) + graphWidth / scale, Math.abs(viewY / scale) + graphHeight / scale]];
}

// active zooming feature
function invokeActiveZooming() {
  if (styleCoastlineAuto.checked) {
    // toggle shade/blur filter for coatline on zoom
    let filter = scale > 2.6 ? "url(#blurFilter)" : "url(#dropShadow)";
    if (scale > 1.5 && scale <= 2.6) filter = null;
    coastline.attr("filter", filter);
  }

  // rescale lables on zoom
  if (labels.style("display") !== "none") {
    labels.selectAll("g").each(function(d) {
      if (this.id === "burgLabels") return;
      const desired = +this.dataset.size;
      const relative = Math.max(rn((desired + desired / scale) / 2, 2), 1);
      this.getAttribute("font-size", relative);
      const hidden = hideLabels.checked && (relative * scale < 6 || relative * scale > 50);
      if (hidden) this.classList.add("hidden"); else this.classList.remove("hidden");
    });
  }

  // turn off ocean pattern if scale is big (improves performance)
  oceanPattern.select("rect").attr("fill", scale > 10 ? "#fff" : "url(#oceanic)").attr("opacity", scale > 10 ? .2 : null);

  // change states halo width
  if (!customization) {
    const haloSize = rn(styleStatesHaloWidth.value / scale, 1);
    statesHalo.attr("stroke-width", haloSize).style("display", haloSize > 3 ? "block" : "none");
  }

  // rescale map markers
  if (styleRescaleMarkers.checked && markers.style("display") !== "none") {
    markers.selectAll("use").each(function(d) {
      const x = +this.dataset.x, y = +this.dataset.y, desired = +this.dataset.size;
      const size = Math.max(desired * 5 + 25 / scale, 1);
      d3.select(this).attr("x", x - size/2).attr("y", y - size).attr("width", size).attr("height", size);
    });
  }

  // rescale rulers to have always the same size
  if (ruler.style("display") !== "none") {
    const size = rn(1 / scale ** .3 * 2, 1);
    ruler.selectAll("circle").attr("r", 2 * size).attr("stroke-width", .5 * size);
    ruler.selectAll("rect").attr("stroke-width", .5 * size);
    ruler.selectAll("text").attr("font-size", 10 * size);
    ruler.selectAll("line, path").attr("stroke-width", size);
  }
}

// Pull request from @evyatron
void function addDragToUpload() {
  document.addEventListener('dragover', function(e) {
    e.stopPropagation();
    e.preventDefault();
    $('#map-dragged').show();
  });

  document.addEventListener('dragleave', function(e) {
    $('#map-dragged').hide();
  });

  document.addEventListener('drop', function(e) {
    e.stopPropagation();
    e.preventDefault();
    $('#map-dragged').hide();
    // no files or more than one
    if (e.dataTransfer.items == null || e.dataTransfer.items.length != 1) {return;}
    const file = e.dataTransfer.items[0].getAsFile();
    // not a .map file
    if (file.name.indexOf('.map') == -1) {
      alertMessage.innerHTML = 'Please upload a <b>.map</b> file you have previously downloaded';
      $("#alert").dialog({
        resizable: false, title: "Invalid file format",
        width: 400, buttons: {
          Close: function() { $(this).dialog("close"); }
        }, position: {my: "center", at: "center", of: "svg"}
      });
      return;
    }
    // all good - show uploading text and load the map
    $("#map-dragged > p").text("Uploading<span>.</span><span>.</span><span>.</span>");
    closeDialogs();
    uploadFile(file, function onUploadFinish() {
      $("#map-dragged > p").text("Drop to upload");
    });
  });
}()

function generate() {
  try {
    const timeStart = performance.now();
    invokeActiveZooming();
    generateSeed();
    console.group("Generated Map " + seed);
    applyMapSize();
    randomizeOptions();
    placePoints();
    calculateVoronoi(grid, grid.points);
    drawScaleBar();
    HeightmapGenerator.generate();
    markFeatures();
    openNearSeaLakes();
    OceanLayers();
    calculateMapCoordinates();
    calculateTemperatures();
    generatePrecipitation();
    reGraph();
    drawCoastline();

    elevateLakes();
    Rivers.generate();
    defineBiomes();

    rankCells();
    Cultures.generate();
    Cultures.expand();
    BurgsAndStates.generate();
    Religions.generate();

    drawStates();
    drawBorders();
    BurgsAndStates.drawStateLabels();
    addZone();
    addMarkers();

    console.warn(`TOTAL: ${rn((performance.now()-timeStart)/1000,2)}s`);
    showStatistics();
    console.groupEnd("Generated Map " + seed);
  }
  catch(error) {
    console.error(error);
    clearMainTip();

    alertMessage.innerHTML = `An error is occured on map generation. Please retry.
      <br>If error is critical, clear the stored data and try again.
      <p id="errorBox">${parseError(error)}</p>`;
    $("#alert").dialog({
      resizable: false, title: "Generation error", width:320, buttons: {
        "Clear data": function() {localStorage.clear(); localStorage.setItem("version", version);},
        Regenerate: function() {regenerateMap(); $(this).dialog("close");},
        Ignore: function() {$(this).dialog("close");}
      }, position: {my: "center", at: "center", of: "svg"}
    });
  }

}

// generate map seed (string!) or get it from URL searchParams
function generateSeed() {
  const first = !mapHistory[0];
  const url = new URL(window.location.href);
  const params = url.searchParams;
  const urlSeed = url.searchParams.get("seed");
  if (first && params.get("from") === "MFCG" && urlSeed.length === 13) seed = urlSeed.slice(0,-4);
  else if (first && urlSeed) seed = urlSeed;
  else if (optionsSeed.value && optionsSeed.value != seed) seed = optionsSeed.value;
  else seed = Math.floor(Math.random() * 1e9).toString();
  optionsSeed.value = seed;
  Math.seedrandom(seed);
}

// Place points to calculate Voronoi diagram
function placePoints() {
  console.time("placePoints");
  const cellsDesired = 10000 * densityInput.value; // generate 10k points for graphSize = 1
  const spacing = grid.spacing = rn(Math.sqrt(graphWidth * graphHeight / cellsDesired), 2); // spacing between points before jirrering
  grid.boundary = getBoundaryPoints(graphWidth, graphHeight, spacing);
  grid.points = getJitteredGrid(graphWidth, graphHeight, spacing); // jittered square grid
  grid.cellsX = Math.floor((graphWidth + 0.5 * spacing) / spacing);
  grid.cellsY = Math.floor((graphHeight + 0.5 * spacing) / spacing);
  console.timeEnd("placePoints");
}

// calculate Delaunay and then Voronoi diagram
function calculateVoronoi(graph, points) {
  console.time("calculateDelaunay");
  const n = points.length;
  const allPoints = points.concat(grid.boundary);
  const delaunay = Delaunator.from(allPoints);
  console.timeEnd("calculateDelaunay");

  console.time("calculateVoronoi");
  const voronoi = Voronoi(delaunay, allPoints, n);
  graph.cells = voronoi.cells;
  graph.cells.i = n < 65535 ? Uint16Array.from(d3.range(n)) : Uint32Array.from(d3.range(n)); // array of indexes
  graph.vertices = voronoi.vertices;
  console.timeEnd("calculateVoronoi");
}

// Mark features (ocean, lakes, islands)
function markFeatures() {
  console.time("markFeatures");
  Math.seedrandom(seed); // restart Math.random() to get the same result on heightmap edit in Erase mode
  const cells = grid.cells, heights = grid.cells.h;
  cells.f = new Uint16Array(cells.i.length); // cell feature number
  cells.t = new Int8Array(cells.i.length); // cell type: 1 = land coast; -1 = water near coast;
  grid.features = [0];

  for (let i=1, queue=[0]; queue[0] !== -1; i++) {
    cells.f[queue[0]] = i; // feature number
    const land = heights[queue[0]] >= 20;
    let border = false; // true if feature touches map border

    while (queue.length) {
      const q = queue.pop();
      if (cells.b[q]) border = true;
      cells.c[q].forEach(function(e) {
        const eLand = heights[e] >= 20;
        //if (eLand) cells.t[e] = 2;
        if (land === eLand && cells.f[e] === 0) {
          cells.f[e] = i;
          queue.push(e);
        }
        if (land && !eLand) {cells.t[q] = 1; cells.t[e] = -1;}
      });
    }
    const type = land ? "island" : border ? "ocean" : "lake";
    grid.features.push({i, land, border, type});

    queue[0] = cells.f.findIndex(f => !f); // find unmarked cell
  }

  console.timeEnd("markFeatures");
}

// How to handle lakes generated near seas? They can be both open or closed.
// As these lakes are usually get a lot of water inflow, most of them should have brake the treshold and flow to sea via river or strait (see Ancylus Lake).
// So I will help this process and open these kind of lakes setting a treshold cell heigh below the sea level (=19).
function openNearSeaLakes() {
  if (templateInput.value === "Atoll") return; // no need for Atolls
  const cells = grid.cells, features = grid.features;
  if (!features.find(f => f.type === "lake")) return; // no lakes
  console.time("openLakes");
  const limit = 50; // max height that can be breached by water

  for (let t = 0, removed = true; t < 5 && removed; t++) {
    removed = false;

    for (const i of cells.i) {
      const lake = cells.f[i];
      if (features[lake].type !== "lake") continue; // not a lake cell

      check_neighbours:
      for (const c of cells.c[i]) {
        if (cells.t[c] !== 1 || cells.h[c] > limit) continue; // water cannot brake this

        for (const n of cells.c[c]) {
          const ocean = cells.f[n];
          if (features[ocean].type !== "ocean") continue; // not an ocean
          removed = removeLake(c, lake, ocean);
          break check_neighbours;
        }
      }
    }

  }

  function removeLake(treshold, lake, ocean) {
    cells.h[treshold] = 19;
    cells.t[treshold] = -1;
    cells.f[treshold] = ocean;
    cells.c[treshold].forEach(function(c) {
      if (cells.h[c] >= 20) cells.t[c] = 1; // mark as coastline
    });
    features[lake].type = "ocean"; // mark former lake as ocean
    return true;
  }

  console.timeEnd("openLakes");
}

// calculate map position on globe
function calculateMapCoordinates() {
  const size = +document.getElementById("mapSizeOutput").value;
  const latShift = +document.getElementById("latitudeOutput").value;

  const latT = size / 100 * 180;
  const latN = 90 - (180 - latT) * latShift / 100;
  const latS = latN - latT;

  const lon = Math.min(graphWidth / graphHeight * latT / 2, 180);
  mapCoordinates = {latT, latN, latS, lonT: lon*2, lonW: -lon, lonE: lon};
}

// temperature model
function calculateTemperatures() {
  console.time('calculateTemperatures');
  const cells = grid.cells;
  cells.temp = new Int8Array(cells.i.length); // temperature array

  const tEq = +temperatureEquatorInput.value;
  const tPole = +temperaturePoleInput.value;
  const tDelta = tEq - tPole;

  d3.range(0, cells.i.length, grid.cellsX).forEach(function(r) {
    const y = grid.points[r][1];
    const lat = Math.abs(mapCoordinates.latN - y / graphHeight * mapCoordinates.latT);
    const initTemp = tEq - lat / 90 * tDelta;
    for (let i = r; i < r+grid.cellsX; i++) {
      cells.temp[i] = initTemp - convertToFriendly(cells.h[i]);
    }
  });

  // temperature decreases by 6.5 degree C per 1km
  function convertToFriendly(h) {
    if (h < 20) return 0;
    const exponent = +heightExponentInput.value;
    const height = Math.pow(h - 18, exponent);
    return rn(height / 1000 * 6.5);
  }

  console.timeEnd('calculateTemperatures');
}

// simplest precipitation model
function generatePrecipitation() {
  console.time('generatePrecipitation');
  prec.selectAll("*").remove();
  const cells = grid.cells;
  cells.prec = new Uint8Array(cells.i.length); // precipitation array
  const modifier = precInput.value / 100; // user's input
  const cellsX = grid.cellsX, cellsY = grid.cellsY;
  let westerly = [], easterly = [], southerly = 0, northerly = 0;

  {// latitude bands
  // x4 = 0-5 latitude: wet throught the year (rising zone)
  // x2 = 5-20 latitude: wet summer (rising zone), dry winter (sinking zone)
  // x1 = 20-30 latitude: dry all year (sinking zone)
  // x2 = 30-50 latitude: wet winter (rising zone), dry summer (sinking zone)
  // x3 = 50-60 latitude: wet all year (rising zone)
  // x2 = 60-70 latitude: wet summer (rising zone), dry winter (sinking zone)
  // x1 = 70-90 latitude: dry all year (sinking zone)
  }
  const lalitudeModifier = [4,2,2,2,1,1,2,2,2,2,3,3,2,2,1,1,1,0.5]; // by 5d step

  // difine wind directions based on cells latitude and prevailing winds there
  d3.range(0, cells.i.length, cellsX).forEach(function(c, i) {
    const lat = mapCoordinates.latN - i / cellsY * mapCoordinates.latT;
    const band = (Math.abs(lat) - 1) / 5 | 0;
    const latMod = lalitudeModifier[band];
    const tier = Math.abs(lat - 89) / 30 | 0; // 30d tiers from 0 to 5 from N to S
    if (winds[tier] > 40 && winds[tier] < 140) westerly.push([c, latMod, tier]);
    else if (winds[tier] > 220 && winds[tier] < 320) easterly.push([c + cellsX -1, latMod, tier]);
    if (winds[tier] > 100 && winds[tier] < 260) northerly++;
    else if (winds[tier] > 280 || winds[tier] < 80) southerly++;
  });

  // distribute winds by direction
  if (westerly.length) passWind(westerly, 120 * modifier, 1, cellsX);
  if (easterly.length) passWind(easterly, 120 * modifier, -1, cellsX);
  const vertT = (southerly + northerly);
  if (northerly) {
    const bandN = (Math.abs(mapCoordinates.latN) - 1) / 5 | 0;
    const latModN = mapCoordinates.latT > 60 ? d3.mean(lalitudeModifier) : lalitudeModifier[bandN];
    const maxPrecN = northerly / vertT * 60 * modifier * latModN;
    passWind(d3.range(0, cellsX, 1), maxPrecN, cellsX, cellsY);
  }
  if (southerly) {
    const bandS = (Math.abs(mapCoordinates.latS) - 1) / 5 | 0;
    const latModS = mapCoordinates.latT > 60 ? d3.mean(lalitudeModifier) : lalitudeModifier[bandS];
    const maxPrecS = southerly / vertT * 60 * modifier * latModS;
    passWind(d3.range(cells.i.length - cellsX, cells.i.length, 1), maxPrecS, -cellsX, cellsY);
  }

  function passWind(source, maxPrec, next, steps) {
    const maxPrecInit = maxPrec;
    for (let first of source) {
      if (first[0]) {maxPrec = Math.min(maxPrecInit * first[1], 255); first = first[0];}
      let humidity = maxPrec - cells.h[first]; // initial water amount
      if (humidity <= 0) continue; // if first cell in row is too elevated cosdired wind dry
      for (let s = 0, current = first; s < steps; s++, current += next) {
        // no flux on permafrost
        if (cells.temp[current] < -5) continue;
        // water cell
        if (cells.h[current] < 20) {
          if (cells.h[current+next] >= 20) {
            cells.prec[current+next] += Math.max(humidity / rand(10, 20), 1); // coastal precipitation
          } else {
            humidity = Math.min(humidity + 5 * modifier, maxPrec); // wind gets more humidity passing water cell
            cells.prec[current] += 5 * modifier; // water cells precipitation (need to correctly pour water through lakes)
          }
          continue;
        }

        // land cell
        const precipitation = getPrecipitation(humidity, current, next);
        cells.prec[current] += precipitation;
        const evaporation = precipitation > 1.5 ? 1 : 0; // some humidity evaporates back to the atmosphere
        humidity = Math.min(Math.max(humidity - precipitation + evaporation, 0), maxPrec);
      }
    }
  }

  function getPrecipitation(humidity, i, n) {
    if (cells.h[i+n] > 85) return humidity; // 85 is max passable height
    const normalLoss = Math.max(humidity / (10 * modifier), 1); // precipitation in normal conditions
    const diff = Math.max(cells.h[i+n] - cells.h[i], 0); // difference in height
    const mod = (cells.h[i+n] / 70) ** 2; // 50 stands for hills, 70 for mountains
    return Math.min(Math.max(normalLoss + diff * mod, 1), humidity);
  }

  void function drawWindDirection() {
     const wind = prec.append("g").attr("id", "wind");

    d3.range(0, 6).forEach(function(t) {
      if (westerly.length > 1) {
        const west = westerly.filter(w => w[2] === t);
        if (west && west.length > 3) {
          const from = west[0][0], to = west[west.length-1][0];
          const y = (grid.points[from][1] + grid.points[to][1]) / 2;
          wind.append("text").attr("x", 20).attr("y", y).text("\u21C9");
        }
      }
      if (easterly.length > 1) {
        const east = easterly.filter(w => w[2] === t);
        if (east && east.length > 3) {
          const from = east[0][0], to = east[east.length-1][0];
          const y = (grid.points[from][1] + grid.points[to][1]) / 2;
          wind.append("text").attr("x", graphWidth - 52).attr("y", y).text("\u21C7");
        }
      }
    });

    if (northerly) wind.append("text").attr("x", graphWidth / 2).attr("y", 42).text("\u21CA");
    if (southerly) wind.append("text").attr("x", graphWidth / 2).attr("y", graphHeight - 20).text("\u21C8");
  }();

  console.timeEnd('generatePrecipitation');
}

// recalculate Voronoi Graph to pack cells
function reGraph() {
  console.time("reGraph");
  let cells = grid.cells, points = grid.points, features = grid.features;
  const newCells = {p:[], g:[], h:[], t:[], f:[], r:[], biome:[]}; // to store new data
  const spacing2 = grid.spacing ** 2;

  for (const i of cells.i) {
    const height = cells.h[i];
    const type = cells.t[i];
    if (height < 20 && type !== -1 && type !== -2) continue; // exclude all deep ocean points
    if (type === -2 && (i%4=== 0 || features[cells.f[i]].type === "lake")) continue; // exclude non-coastal lake points
    const x = points[i][0], y = points[i][1];

    addNewPoint(x, y); // add point to array
    // add additional points for cells along coast
    if (type === 1 || type === -1) {
      if (cells.b[i]) continue; // not for near-border cells
      cells.c[i].forEach(function(e) {
        if (i > e) return;
        if (cells.t[e] === type) {
          const dist2 = (y - points[e][1]) ** 2 + (x - points[e][0]) ** 2;
          if (dist2 < spacing2) return; // too close to each other
          const x1 = rn((x + points[e][0]) / 2, 1);
          const y1 = rn((y + points[e][1]) / 2, 1);
          addNewPoint(x1, y1);
        }
      });
    }

    function addNewPoint(x, y) {
      newCells.p.push([x, y]);
      newCells.g.push(i);
      newCells.h.push(height);
    }
  }

  calculateVoronoi(pack, newCells.p);
  cells = pack.cells;
  cells.p = newCells.p; // points coordinates [x, y]
  cells.g = grid.cells.i.length < 65535 ? Uint16Array.from(newCells.g) : Uint32Array.from(newCells.g); // reference to initial grid cell
  cells.q = d3.quadtree(cells.p.map((p, d) => [p[0], p[1], d])); // points quadtree for fast search
  cells.h = new Uint8Array(newCells.h); // heights
  cells.area = new Uint16Array(cells.i.length); // cell area
  cells.i.forEach(i => cells.area[i] = Math.abs(d3.polygonArea(getPackPolygon(i))));

  console.timeEnd("reGraph");
}

// Detect and draw the coasline
function drawCoastline() {
  console.time('drawCoastline');
  reMarkFeatures();
  const cells = pack.cells, vertices = pack.vertices, n = cells.i.length, features = pack.features;
  const used = new Uint8Array(features.length); // store conneted features
  const largestLand = d3.scan(features.map(f => f.land ? f.cells : 0), (a, b) => b - a);
  const landMask = defs.select("#land");
  const waterMask = defs.select("#water");
  lineGen.curve(d3.curveBasisClosed);

  for (const i of cells.i) {
    const startFromEdge = !i && cells.h[i] >= 20;
    if (!startFromEdge && cells.t[i] !== -1 && cells.t[i] !== 1) continue; // non-edge cell
    const f = cells.f[i];
    if (used[f]) continue; // already connected
    if (features[f].type === "ocean") continue; // ocean cell

    const type = features[f].type === "lake" ? 1 : -1; // type value to search for
    const start = findStart(i, type);
    if (start === -1) continue; // cannot start here
    const connectedVertices = connectVertices(start, type);
    used[f] = 1;
    let points = connectedVertices.map(v => vertices.p[v]);
    const area = d3.polygonArea(points); // area with lakes/islands
    if (area > 0 && features[f].type === "lake") points = points.reverse();
    features[f].area = Math.abs(area);

    const path = round(lineGen(points));
    const id = features[f].group + features[f].i;
    if (features[f].type === "lake") {
      landMask.append("path").attr("d", path).attr("fill", "black");
      // waterMask.append("path").attr("d", path).attr("fill", "white"); // uncomment to show over lakes
      lakes.select("#"+features[f].group).append("path").attr("d", path).attr("id", id); // draw the lake
    } else {
      landMask.append("path").attr("d", path).attr("fill", "white");
      waterMask.append("path").attr("d", path).attr("fill", "black");
      coastline.append("path").attr("d", path).attr("id", id); // draw the coastline
    }

    // draw ruler to cover the biggest land piece
    if (f === largestLand) {
      const from = points[d3.scan(points, (a, b) => a[0] - b[0])];
      const to = points[d3.scan(points, (a, b) => b[0] - a[0])];
      addRuler(from[0], from[1], to[0], to[1]);
    }
  }

  // find cell vertex to start path detection
  function findStart(i, t) {
    if (t === -1 && cells.b[i]) return cells.v[i].find(v => vertices.c[v].some(c => c >= n)); // map border cell
    const filtered = cells.c[i].filter(c => cells.t[c] === t);
    const index = cells.c[i].indexOf(d3.min(filtered));
    return index === -1 ? index : cells.v[i][index];
  }

  // connect vertices to chain
  function connectVertices(start, t) {
    const chain = []; // vertices chain to form a path
    for (let i=0, current = start; i === 0 || current !== start && i < 10000; i++) {
      const prev = chain[chain.length-1]; // previous vertex in chain
      //d3.select("#labels").append("text").attr("x", vertices.p[current][0]).attr("y", vertices.p[current][1]).text(i).attr("font-size", "1px");
      chain.push(current); // add current vertex to sequence
      const c = vertices.c[current] // cells adjacent to vertex
      const v = vertices.v[current] // neighboring vertices
      const c0 = c[0] >= n || cells.t[c[0]] === t;
      const c1 = c[1] >= n || cells.t[c[1]] === t;
      const c2 = c[2] >= n || cells.t[c[2]] === t;
      if (v[0] !== prev && c0 !== c1) current = v[0]; else
      if (v[1] !== prev && c1 !== c2) current = v[1]; else
      if (v[2] !== prev && c0 !== c2) current = v[2];
      if (current === chain[chain.length-1]) {console.error("Next vertex is not found"); break;}
    }
    chain.push(chain[0]); // push first vertex as the last one
    return chain;
  }

  console.timeEnd('drawCoastline');
}

// Re-mark features (ocean, lakes, islands)
function reMarkFeatures() {
  console.time("reMarkFeatures");
  const cells = pack.cells, features = pack.features = [0];
  const continentCells = grid.cells.i.length / 10, islandCell = continentCells / 50;
  cells.f = new Uint16Array(cells.i.length); // cell feature number
  cells.t = new Int8Array(cells.i.length); // cell type: 1 = land along coast; -1 = water along coast;
  cells.haven = new Uint16Array(cells.i.length); // cell haven (opposite water cell);
  cells.harbor = new Uint16Array(cells.i.length); // cell harbor (number of adjacent water cells);

  for (let i=1, queue=[0]; queue[0] !== -1; i++) {
    cells.f[queue[0]] = i; // feature number
    const land = cells.h[queue[0]] >= 20;
    let border = false; // true if feature touches map border
    let cellNumber = 1; // to count cells number in a feature
    const temp = grid.cells.temp[cells.g[queue[0]]]; // first cell temparature

    while (queue.length) {
      const q = queue.pop();
      if (cells.b[q]) border = true;
      cells.c[q].forEach(function(e) {
        const eLand = cells.h[e] >= 20;
        if (land === eLand && cells.f[e] === 0) {
          cells.f[e] = i;
          queue.push(e);
          cellNumber++;
        }
        if (land && !eLand) {
          cells.t[q] = 1;
          cells.t[e] = -1;
          cells.harbor[q]++;
          if (!cells.haven[q]) cells.haven[q] = e;
        } else if (land && eLand) {
          if (!cells.t[e] && cells.t[q] === 1) cells.t[e] = 2;
          else if (!cells.t[q] && cells.t[e] === 1) cells.t[q] = 2;
        }
      });
    }

    const type = land ? "island" : border ? "ocean" : "lake";
    let group;
    if (type === "lake") group = temp < 25 ? "freshwater" : "salt"; else
    if (type === "ocean") group = "ocean"; else
    if (type === "island") group = cellNumber > continentCells ? "continent" : cellNumber > islandCell ? "island" : "isle";
    features.push({i, land, border, type, cells: cellNumber, group});
    queue[0] = cells.f.findIndex(f => !f); // find unmarked cell
  }

  console.timeEnd("reMarkFeatures");
}

// temporary elevate some lakes to resolve depressions and flux the water to form an open (exorheic) lake
function elevateLakes() {
  if (templateInput.value === "Atoll") return; // no need for Atolls
  console.time('elevateLakes');
  const cells = pack.cells, features = pack.features;
  const maxCells = cells.i.length / 100; // size limit; let big lakes be closed (endorheic)
  const lakes = cells.i
    .filter(i => features[cells.f[i]].group === "freshwater" && features[cells.f[i]].cells < maxCells)
    .sort(highest); // highest cells go first

  for (const i of lakes) {
    //debug.append("circle").attr("cx", cells.p[i][0]).attr("cy", cells.p[i][1]).attr("r", 1).attr("fill", "blue");
    const hs = cells.c[i].filter(isLand).map(c => cells.h[c]);
    cells.h[i] = Math.max(d3.min(hs) - 5, 20) || 20;
  }

  console.timeEnd('elevateLakes');
}

// assign biome id for each cell
function defineBiomes() {
  console.time("defineBiomes");
  const cells = pack.cells, f = pack.features;
  cells.biome = new Uint8Array(cells.i.length); // biomes array

  for (const i of cells.i) {
    if (f[cells.f[i]].group === "freshwater") cells.h[i] = 19; // de-elevate lakes
    if (cells.h[i] < 20) continue; // water cells have biome 0
    let moist = grid.cells.prec[cells.g[i]];
    if (cells.r[i]) moist += Math.max(cells.fl[i] / 20, 2);
    const n = cells.c[i].filter(isLand).map(c => grid.cells.prec[cells.g[c]]).concat([moist]);
    moist = rn(4 + d3.mean(n));
    const temp = grid.cells.temp[cells.g[i]]; // flux from precipitation
    cells.biome[i] = getBiomeId(moist, temp, cells.h[i]);
  }

  function getBiomeId(moisture, temperature, height) {
    if (temperature < -5) return 11; // permafrost biome
    if (moisture > 40 && height < 25 || moisture > 24 && height > 24) return 12; // wetland biome
    const m = Math.min(moisture / 5 | 0, 4); // moisture band from 0 to 4
    const t = Math.min(Math.max(20 - temperature, 0), 25); // temparature band from 0 to 25
    return biomesData.biomesMartix[m][t];
  }

  console.timeEnd("defineBiomes");
}

// assess cells suitability to calculate population and rand cells for culture center and burgs placement
function rankCells() {
  console.time('rankCells');
  const cells = pack.cells, f = pack.features;
  cells.s = new Int16Array(cells.i.length); // cell suitability array
  cells.pop = new Uint16Array(cells.i.length); // cell population array

  const flMean = d3.median(cells.fl.filter(f => f)), flMax = d3.max(cells.fl) + d3.max(cells.conf); // to normalize flux
  const areaMean = d3.mean(cells.area); // to adjust population by cell area

  for (const i of cells.i) {
    let s = +biomesData.habitability[cells.biome[i]]; // base suitability derived from biome habitability
    if (!s) continue; // uninhabitable biomes has 0 suitability
    s += normalize(cells.fl[i] + cells.conf[i], flMean, flMax) * 250; // big rivers and confluences are valued
    s -= (cells.h[i] - 50) / 5; // low elevation is valued, high is not;

    if (cells.t[i] === 1) {
      if (cells.r[i]) s += 15; // estuary is valued
      const type = f[cells.f[cells.haven[i]]].type;
      const group = f[cells.f[cells.haven[i]]].group;
      if (type === "lake") {
        if (group === "salt") s += 10; else s += 30; // lake coast is valued
      } else {
        s += 5; // ocean coast is valued
        if (cells.harbor[i] === 1) s += 20; // safe sea harbor is valued
      }
    }

    cells.s[i] = s / 5; // general population rate
    // cell rural population is suitability adjusted by cell area
    cells.pop[i] = cells.s[i] > 0 ? cells.s[i] * cells.area[i] / areaMean : 0;
  }

  console.timeEnd('rankCells');
}

// add a zone as an example: rebels along one border
function addZone() {
  const cells = pack.cells, states = pack.states;
  const state = states.find(s => s.i && s.neighbors.size > 0 && s.neighbors.values().next().value);
  if (!state) return;

  const neib = state.neighbors.values().next().value;
  const data = cells.i.filter(i => cells.state[i] === state.i && cells.c[i].some(c => cells.state[c] === neib));

  const rebels = rw({Rebels:5, Insurgents:2, Recusants:1, Mutineers:1, Rioters:1, Dissenters:1, Secessionists:1, Insurrection:2, Rebellion:1, Conspiracy:2});
  const name = getAdjective(states[neib].name) + " " + rebels;

  const zone = zones.append("g").attr("id", "zone0").attr("data-description", name).attr("data-cells", data).attr("fill", "url(#hatch3)");
  zone.selectAll("polygon").data(data).enter().append("polygon").attr("points", d => getPackPolygon(d)).attr("id", d => "zone0_"+d);
}

// add some markers as an example
function addMarkers() {
  console.time("addMarkers");
  const cells = pack.cells;

  void function addVolcanoes() {
    let mounts = Array.from(cells.i).filter(i => cells.h[i] > 70).sort((a, b) => cells.h[b] - cells.h[a]);
    let count = mounts.length < 10 ? 0 : Math.ceil(mounts.length / 300);
    if (count) addMarker("volcano", "🌋", 52, 52, 17.5);

    while (count) {
      const cell = mounts.splice(biased(0, mounts.length-1, 5), 1);
      const x = cells.p[cell][0], y = cells.p[cell][1];
      const id = getNextId("markerElement");
      markers.append("use").attr("id", id)
        .attr("xlink:href", "#marker_volcano").attr("data-id", "#marker_volcano")
        .attr("data-x", x).attr("data-y", y).attr("x", x - 15).attr("y", y - 30)
        .attr("data-size", 1).attr("width", 30).attr("height", 30);
      const height = getFriendlyHeight([x, y]);
      const proper = Names.getCulture(cells.culture[cell]);
      const name = Math.random() < .3 ? "Mount " + proper : Math.random() > .3 ? proper + " Volcano" : proper;
      notes.push({id, name, legend:`Active volcano. Height: ${height}`});
      count--;
    }
  }()

  void function addHotSprings() {
    let springs = Array.from(cells.i).filter(i => cells.h[i] > 50).sort((a, b) => cells.h[b]-cells.h[a]);
    let count = springs.length < 30 ? 0 : Math.ceil(springs.length / 1000);
    if (count) addMarker("hot_springs", "♨", 50, 50, 19.5);

    while (count) {
      const cell = springs.splice(biased(1, springs.length-1, 3), 1);
      const x = cells.p[cell][0], y = cells.p[cell][1];
      const id = getNextId("markerElement");
      markers.append("use").attr("id", id)
        .attr("xlink:href", "#marker_hot_springs").attr("data-id", "#marker_hot_springs")
        .attr("data-x", x).attr("data-y", y).attr("x", x - 15).attr("y", y - 30)
        .attr("data-size", 1).attr("width", 30).attr("height", 30);

      const proper = Names.getCulture(cells.culture[cell]);
      const temp = convertTemperature(gauss(25,15,20,100));
      notes.push({id, name: proper + " Hot Springs", legend:`A hot springs area. Temperature: ${temp}`});
      count--;
    }
  }()

  void function addMines() {
    let hills = Array.from(cells.i).filter(i => cells.h[i] > 47 && cells.burg[i]);
    let count = !hills.length ? 0 : Math.ceil(hills.length / 7);
    if (!count) return;

    addMarker("mine", "⚒", 50, 50, 20);
    const resources = {"salt":5, "gold":2, "silver":4, "copper":2, "iron":3, "lead":1, "tin":1};

    while (count) {
      const cell = hills.splice(Math.floor(Math.random() * hills.length), 1);
      const x = cells.p[cell][0], y = cells.p[cell][1];
      const id = getNextId("markerElement");
      markers.append("use").attr("id", id)
        .attr("xlink:href", "#marker_mine").attr("data-id", "#marker_mine")
        .attr("data-x", x).attr("data-y", y).attr("x", x - 15).attr("y", y - 30)
        .attr("data-size", 1).attr("width", 30).attr("height", 30);
      const resource = rw(resources);
      const burg = pack.burgs[cells.burg[cell]];
      const name = `${burg.name} - ${resource} mining town`;
      const population = rn(burg.population * populationRate.value * urbanization.value);
      const legend = `${burg.name} is a mining town of ${population} people just nearby the ${resource} mine`;
      notes.push({id, name, legend});
      count--;
    }
  }()

  void function addBridges() {
    const meanRoad = d3.mean(cells.road.filter(r => r));
    const meanFlux = d3.mean(cells.fl.filter(fl => fl));

    let bridges = Array.from(cells.i)
      .filter(i => cells.burg[i] && cells.h[i] >= 20 && cells.r[i] && cells.fl[i] > meanFlux && cells.road[i] > meanRoad)
      .sort((a, b) => (cells.road[b] + cells.fl[b] / 10) - (cells.road[a] + cells.fl[a] / 10));

    let count = !bridges.length ? 0 : Math.ceil(bridges.length / 12);
    if (count) addMarker("bridge", "🌉", 50, 50, 16.5);

    while (count) {
      const cell = bridges.splice(0, 1);
      const x = cells.p[cell][0], y = cells.p[cell][1];
      const id = getNextId("markerElement");
      markers.append("use").attr("id", id)
        .attr("xlink:href", "#marker_bridge").attr("data-id", "#marker_bridge")
        .attr("data-x", x).attr("data-y", y).attr("x", x - 15).attr("y", y - 30)
        .attr("data-size", 1).attr("width", 30).attr("height", 30);

      const burg = pack.burgs[cells.burg[cell]];
      const river = Names.getCulture(cells.culture[cell]); // river name
      const name = Math.random() < .2 ? river : burg.name;
      notes.push({id, name:`${name} Bridge`, legend:`A stone bridge over the ${river} River near ${burg.name}`});
      count--;
    }
  }()

  void function addInns() {
    const maxRoad = d3.max(cells.road) * .9;
    let taverns = Array.from(cells.i).filter(i => cells.crossroad[i] && cells.h[i] >= 20 && cells.road[i] > maxRoad);
    if (!taverns.length) return;
    addMarker("inn", "🍻", 50, 50, 17.5);

    const color = ["Dark", "Light", "Bright", "Golden", "White", "Black", "Red", "Pink", "Purple", "Blue", "Green", "Yellow", "Amber", "Orange", "Brown", "Grey"];
    const animal = ["Antelope", "Ape", "Badger", "Bear", "Beaver", "Bison", "Boar", "Buffalo", "Cat", "Crane", "Crocodile", "Crow", "Deer", "Dog", "Eagle", "Elk", "Fox", "Goat", "Goose", "Hare", "Hawk", "Heron", "Horse", "Hyena", "Ibis", "Jackal", "Jaguar", "Lark", "Leopard", "Lion", "Mantis", "Marten", "Moose", "Mule", "Narwhal", "Owl", "Panther", "Rat", "Raven", "Rook", "Scorpion", "Shark", "Sheep", "Snake", "Spider", "Swan", "Tiger", "Turtle", "Wolf", "Wolverine", "Camel", "Falcon", "Hound", "Ox"];
    const adj = ["New", "Good", "High", "Old", "Great", "Big", "Major", "Happy", "Main", "Huge", "Far", "Beautiful", "Fair", "Prime", "Ancient", "Golden", "Proud", "Lucky", "Fat", "Honest", "Giant", "Distant", "Friendly", "Loud", "Hungry", "Magical", "Superior", "Peaceful", "Frozen", "Divine", "Favorable", "Brave", "Sunny", "Flying"];


    for (let i=0; i < taverns.length && i < 4; i++) {
      const cell = taverns.splice(Math.floor(Math.random() * taverns.length), 1);
      const x = cells.p[cell][0], y = cells.p[cell][1];
      const id = getNextId("markerElement");

      markers.append("use").attr("id", id)
        .attr("xlink:href", "#marker_inn").attr("data-id", "#marker_inn")
        .attr("data-x", x).attr("data-y", y).attr("x", x - 15).attr("y", y - 30)
        .attr("data-size", 1).attr("width", 30).attr("height", 30);

      const type = Math.random() > .7 ? "inn" : "tavern";
      const name = Math.random() < .5 ? ra(color) + " " + ra(animal) : Math.random() < .6 ? ra(adj) + " " + ra(animal) : ra(adj) + " " + capitalize(type);
      notes.push({id, name: "The " + name, legend:`A big and famous roadside ${type}`});
    }
  }()

  void function addLighthouses() {
    const lands = cells.i.filter(i => cells.harbor[i] > 6 && cells.c[i].some(c => cells.h[c] < 20 && cells.road[c]));
    const lighthouses = Array.from(lands).map(i => [i, cells.v[i][cells.c[i].findIndex(c => cells.h[c] < 20 && cells.road[c])]]);
    if (lighthouses.length) addMarker("lighthouse", "🚨", 50, 50, 16);

    for (let i=0; i < lighthouses.length && i < 4; i++) {
      const cell = lighthouses[i][0], vertex = lighthouses[i][1];
      const x = pack.vertices.p[vertex][0], y = pack.vertices.p[vertex][1];
      const id = getNextId("markerElement");

      markers.append("use").attr("id", id)
        .attr("xlink:href", "#marker_lighthouse").attr("data-id", "#marker_lighthouse")
        .attr("data-x", x).attr("data-y", y).attr("x", x - 15).attr("y", y - 30)
        .attr("data-size", 1).attr("width", 30).attr("height", 30);

      const proper = cells.burg[cell] ? pack.burgs[cells.burg[cell]].name : Names.getCulture(cells.culture[cell]);
      notes.push({id, name: getAdjective(proper) + " Lighthouse" + name, legend:`A lighthouse to keep the navigation safe`});
    }
  }()

  void function addWaterfalls() {
    const waterfalls = cells.i.filter(i => cells.r[i] && cells.h[i] > 70);
    if (waterfalls.length) addMarker("waterfall", "⟱", 50, 54, 16.5);

    for (let i=0; i < waterfalls.length && i < 3; i++) {
      const cell = waterfalls[i];
      const x = cells.p[cell][0], y = cells.p[cell][1];
      const id = getNextId("markerElement");

      markers.append("use").attr("id", id)
        .attr("xlink:href", "#marker_waterfall").attr("data-id", "#marker_waterfall")
        .attr("data-x", x).attr("data-y", y).attr("x", x - 15).attr("y", y - 30)
        .attr("data-size", 1).attr("width", 30).attr("height", 30);

      const proper = cells.burg[cell] ? pack.burgs[cells.burg[cell]].name : Names.getCulture(cells.culture[cell]);
      notes.push({id, name: getAdjective(proper) + " Waterfall" + name, legend:`An extremely beautiful waterfall`});
    }
  }()

  void function addBattlefields() {
    let battlefields = Array.from(cells.i).filter(i => cells.pop[i] > 2 && cells.h[i] < 50 && cells.h[i] > 25);
    let count = battlefields.length < 100 ? 0 : Math.ceil(battlefields.length / 500);
    const era = Names.getCulture(0, 3, 7, "", 0) + " Era";
    if (count) addMarker("battlefield", "⚔", 50, 50, 20);

    while (count) {
      const cell = battlefields.splice(Math.floor(Math.random() * battlefields.length), 1);
      const x = cells.p[cell][0], y = cells.p[cell][1];
      const id = getNextId("markerElement");
      markers.append("use").attr("id", id)
        .attr("xlink:href", "#marker_battlefield").attr("data-id", "#marker_battlefield")
        .attr("data-x", x).attr("data-y", y).attr("x", x - 15).attr("y", y - 30)
        .attr("data-size", 1).attr("width", 30).attr("height", 30);

      const name = Names.getCulture(cells.culture[cell]) + " Battlefield";
      const date = new Date(rand(100, 1000),rand(12),rand(31)).toLocaleDateString("en", {year:'numeric', month:'long', day:'numeric'}) + " " + era;
      notes.push({id, name, legend:`A historical battlefield spot. \r\nDate: ${date}`});
      count--;
    }
  }()

  function addMarker(id, icon, x, y, size) {
    const markers = svg.select("#defs-markers");
    if (markers.select("#marker_"+id).size()) return;

    const symbol = markers.append("symbol").attr("id", "marker_"+id).attr("viewBox", "0 0 30 30");
    symbol.append("path").attr("d", "M6,19 l9,10 L24,19").attr("fill", "#000000").attr("stroke", "none");
    symbol.append("circle").attr("cx", 15).attr("cy", 15).attr("r", 10).attr("fill", "#ffffff").attr("stroke", "#000000").attr("stroke-width", 1);
    symbol.append("text").attr("x", x+"%").attr("y", y+"%").attr("fill", "#000000").attr("stroke", "#3200ff").attr("stroke-width", 0)
      .attr("font-size", size+"px").attr("dominant-baseline", "central").text(icon);
  }

  console.timeEnd("addMarkers");
}

// show map stats on generation complete
function showStatistics() {
  const template = templateInput.value;
  const templateRandom = locked("template") ? "" : "(random)";
  const stats = `  Seed: ${seed}
  Size: ${graphWidth}x${graphHeight}
  Template: ${template} ${templateRandom}
  Points: ${grid.points.length}
  Cells: ${pack.cells.i.length}
  States: ${pack.states.length-1}
  Provinces: ${pack.provinces.length-1}
  Burgs: ${pack.burgs.length-1}
  Religions: ${pack.religions.length-1}`;
  mapHistory.push({seed, width:graphWidth, height:graphHeight, template, created: Date.now()});
  console.log(stats);
}

const regenerateMap = debounce(function() {
  console.warn("Generate new random map");
  closeDialogs("#worldConfigurator");
  customization = 0;
  undraw();
  resetZoom(1000);
  generate();
  restoreLayers();
  if ($("#worldConfigurator").is(":visible")) editWorld();
}, 500);

// Clear the map
function undraw() {
  viewbox.selectAll("path, circle, polygon, line, text, use, #zones > g, #ruler > g").remove();
  defs.selectAll("path, clipPath").remove();
  notes = [];
  unfog();
}