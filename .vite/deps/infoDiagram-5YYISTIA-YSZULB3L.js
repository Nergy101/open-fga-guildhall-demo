import {
  parse
} from "./chunk-3OOKJXU3.js";
import "./chunk-3XIQN4RN.js";
import "./chunk-JA7X6GE7.js";
import "./chunk-DTHF6DGS.js";
import "./chunk-AQVNWB57.js";
import "./chunk-Q3UKTOBI.js";
import "./chunk-5IVJXJ23.js";
import "./chunk-NMNFYVV5.js";
import "./chunk-4RGKDB42.js";
import "./chunk-2D3SOG4W.js";
import {
  selectSvgElement
} from "./chunk-JCIJ4F2U.js";
import {
  configureSvgSize
} from "./chunk-2BDZQB5H.js";
import {
  __name,
  log
} from "./chunk-NDHCI2LA.js";
import "./chunk-WP6ZOHZT.js";
import "./chunk-PUWQB52X.js";
import "./chunk-5WRI5ZAA.js";

// node_modules/.deno/mermaid@11.15.0/node_modules/mermaid/dist/chunks/mermaid.core/infoDiagram-5YYISTIA.mjs
var parser = {
  parse: __name(async (input) => {
    const ast = await parse("info", input);
    log.debug(ast);
  }, "parse")
};
var DEFAULT_INFO_DB = {
  version: "11.15.0" + (true ? "" : "-tiny")
};
var getVersion = __name(() => DEFAULT_INFO_DB.version, "getVersion");
var db = {
  getVersion
};
var draw = __name((text, id, version) => {
  log.debug("rendering info diagram\n" + text);
  const svg = selectSvgElement(id);
  configureSvgSize(svg, 100, 400, true);
  const group = svg.append("g");
  group.append("text").attr("x", 100).attr("y", 40).attr("class", "version").attr("font-size", 32).style("text-anchor", "middle").text(`v${version}`);
}, "draw");
var renderer = { draw };
var diagram = {
  parser,
  db,
  renderer
};
export {
  diagram
};
//# sourceMappingURL=infoDiagram-5YYISTIA-YSZULB3L.js.map
