var svgElements = {
  rect: "Rect",
  circle: "Circle",
  ellipse: "Ellipse",
  line: "Line",
  polyline: "Polyline",
  polygon: "Polygon",
  path: "Path",
  text: "Text",
  textPath: "TextPath",
  image: "Image",
  gradient: "Gradient",
  stop: "Stop",
  pattern: "Pattern",
  mask: "Mask",
  clipPath: "ClipPath",
  use: "Use",
  marker: "Marker",
  bare: "Bare"
};

var config = {
  isToolbarInitialized: false,
  isOverlayInitialized: false,
  color: "#f06",
  toolbarEl: null,
  svg: null,
  activeSvgElement: svgElements.circle,
  linearElements: [svgElements.line, svgElements.polyline],
  lastMouseX: 0,
  lastMouseY: 0,
  thresholdDistanceToIgnoreUserInput: 5
};

function toolbarButtonClicked(svgElement, e) {
  config.activeSvgElement = svgElement;
  var oldActiveButton = config.toolbarEl.querySelector("button.active");
  if (oldActiveButton) oldActiveButton.classList.remove("active");
  e.target.classList.add("active");
}

function initToolbar(toolbarEl) {
  if (config.isToolbarInitialized) {
    console.warn("toolbar is already initialized");
    return;
  }
  config.toolbarEl = toolbarEl;
  toolbarEl.classList.add("pdf-annotator-toolbar");

  var colorButton = document.createElement("button");
  colorButton.textContent = "Color";
  colorButton.addEventListener("click", function() {
    config.color = prompt("Color: ", config.color);
  });
  toolbarEl.appendChild(colorButton);

  for (var i = 0; i < Object.keys(svgElements).length; i++) {
    var element = Object.entries(svgElements)[i];
    var key = element[0];
    var value = element[1];
    var button = document.createElement("button");
    button.type = "button";
    button.id = key;
    if (value === config.activeSvgElement) button.classList.add("active");
    button.textContent = value;
    button.addEventListener("click", toolbarButtonClicked.bind(null, value));
    toolbarEl.appendChild(button);
  }
  config.isToolbarInitialized = true;
}

function initWorkbench(workbenchEl, options) {
  if (config.isWorkbenchInitialized) {
    console.warn("workbench is initialized");
    return;
  }
  workbenchEl.classList.add("pdf-annotator-workbench");
  var svgContainer = document.createElement("div");
  svgContainer.id = "svg-container";
  svgContainer.classList.add("pdf-annotator-svg-container");
  workbenchEl.appendChild(svgContainer);

  var svg = SVG("svg-container").size(options.width, options.height);
  svg.click(addShapeAnnotation.bind(null, svg));
  svg.on("mousedown", saveLastMouseDownLocation);
  svg.on("mouseup", addLineAnnotation.bind(null, svg));
  config.isWorkbenchInitialized = true;
  config.svg = svg;
}

function saveLastMouseDownLocation(e) {
  config.lastMouseX = e.layerX;
  config.lastMouseY = e.layerY;
}

function addLineAnnotation(svg, e) {
  if (!config.linearElements.includes(config.activeSvgElement)) {
    return;
  }
  var differenceX = Math.abs(config.lastMouseX - e.layerX);
  var differenceY = Math.abs(config.lastMouseY - e.layerY);
  if (
    differenceX < config.thresholdDistanceToIgnoreUserInput ||
    differenceY < config.thresholdDistanceToIgnoreUserInput
  )
    return;
  switch (config.activeSvgElement) {
    case svgElements.line:
      elementToAdd = svg
        .line(config.lastMouseX, config.lastMouseY, e.layerX, e.layerY)
        .stroke({ width: 1 });
      break;
    case svgElements.polyline:
      elementToAdd = svg.polyline(
        "50,0 30,20 100,50 60,60 50,100 40,60 0,50 40,40"
      );
      elementToAdd.move(e.layerX, e.layerY);
      break;
  }
  elementToAdd.attr({ fill: config.color });

  elementToAdd.click(function(e) {
    elementToAdd.remove();
    e.stopPropagation();
  });
}

function addShapeAnnotation(svg, e) {
  // only shapes can be added (not linear shapes)
  if (config.linearElements.includes(config.activeSvgElement)) {
    return;
  }
  var elementToAdd = null;
  switch (config.activeSvgElement) {
    case svgElements.rect:
      elementToAdd = svg.rect(50, 50);
      break;
    case svgElements.circle:
      elementToAdd = svg.circle(50);
      break;
    case svgElements.ellipse:
      elementToAdd = svg.ellipse(50, 100);
      break;

    case svgElements.polygon:
      elementToAdd = svg.polygon(
        "50,0 60,40 100,50 60,60 50,100 40,60 0,50 40,40"
      );
      break;
    case svgElements.path:
      elementToAdd = svg.path(
        "M0 0 H50 A20 20 0 1 0 100 50 v25 C50 125 0 85 0 85 z"
      );
      break;
    case svgElements.text:
      elementToAdd = svg.text(
        "Lorem ipsum dolor sit amet consectetur.\nCras sodales imperdiet auctor."
      );
      break;
    case svgElements.textPath:
      elementToAdd = svg.text(function(add) {
        add.tspan("We go ").dx(0);
        add
          .tspan("up")
          .fill("#f09")
          .dy(-40);
        add.tspan(", then we go down, then up again").dy(40);
      });

      var path =
        "M 0 0 100 200 C 200 100 300 0 400 100 C 500 200 600 300 700 200 C 800 100 900 100 900 100";

      elementToAdd.path(path).font({ size: 42.5, family: "Verdana" });
      elementToAdd.plot(
        "M 0 0 300 500 C 200 100 300 0 400 100 C 500 200 600 300 700 200 C 800 100 900 100 900 100"
      );
      elementToAdd.textPath().attr("startOffset", "50%");
      elementToAdd
        .textPath()
        .animate(3000)
        .attr("startOffset", "80%");
      break;
    case svgElements.Image:
      elementToAdd = svg.image("/path/to/image.jpg", 200, 300);
      break;
    case svgElements.Gradient:
      elementToAdd = svg.gradient("linear", function(stop) {
        stop.at(0, "#333");
        stop.at(1, "#fff");
      });
      // needs to be applied to another svg element
      break;
    case svgElements.Pattern:
      elementToAdd = svg.pattern(20, 20, function(add) {
        add.rect(20, 20).fill("#f06");
        add.rect(10, 10);
        add.rect(10, 10).move(10, 10);
      });
      // needs to be applied to another svg element
      break;
  }

  elementToAdd.move(e.layerX, e.layerY).attr({ fill: config.color });

  elementToAdd.click(function(e) {
    elementToAdd.remove();
    e.stopPropagation();
  });
}

function save() {
  localStorage.setItem('annotations', config.svg.svg())
}

function load() {
  var annotations = localStorage.getItem('annotations')
config.svg.svg(annotations)
}

var pdfAnnotator = {
  initToolbar: initToolbar,
  initWorkbench: initWorkbench,
  save: save,
  load: load,
};
