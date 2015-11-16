// Pull in your favorite version of jquery 
require({ 
	packages: [{ name: "jquery", location: "http://ajax.googleapis.com/ajax/libs/jquery/2.1.0/", main: "jquery.min" }] 
});
// Bring in dojo and javascript api classes as well as config.json and content.html
define([
	"dojo/_base/declare", "framework/PluginBase", "esri/layers/FeatureLayer", "esri/symbols/SimpleLineSymbol", "esri/symbols/SimpleFillSymbol", 
	"esri/symbols/SimpleMarkerSymbol", "esri/graphic", "dojo/_base/Color", 	"dijit/layout/ContentPane", "dijit/form/HorizontalSlider", "dojo/dom", 
	"dojo/dom-class", "dojo/dom-style", "dojo/dom-construct", "dojo/dom-geometry", "dojo/_base/lang", "dojo/on", "dojo/parser", 'plugins/community-rating-system/js/ConstrainedMoveable',
	"dojo/text!./config.json", "jquery", "dojo/text!./html/legend.html", "dojo/text!./html/content.html", 'plugins/community-rating-system/js/jquery-ui-1.11.0/jquery-ui'
],
function ( declare, PluginBase, FeatureLayer, SimpleLineSymbol, SimpleFillSymbol, SimpleMarkerSymbol, Graphic, Color,
	ContentPane, HorizontalSlider, dom, domClass, domStyle, domConstruct, domGeom, lang, on, parser, ConstrainedMoveable, config, $, legendContent, content, ui ) {
		return declare(PluginBase, {
			toolbarName: "Community Rating System", showServiceLayersInLegend: false, allowIdentifyWhenActive: false, rendered: false, resizable: false,
			hasCustomPrint: true, usePrintPreviewMap: true, previewMapSize: [600, 400],
			// First function called when the user clicks the pluging icon. 
			initialize: function (frameworkParameters) {
				// Access framework parameters
				declare.safeMixin(this, frameworkParameters);
				// Set initial app size based on split screen state
				this.con = dom.byId('plugins/community-rating-system-0');
				this.con1 = dom.byId('plugins/community-rating-system-1');
				if (this.con1 != undefined){
					domStyle.set(this.con1, "width", "330px");
					domStyle.set(this.con1, "height", "510px");
				}else{
					domStyle.set(this.con, "width", "330px");
					domStyle.set(this.con, "height", "510px");
				}	
				// Define object to access global variables from JSON object. Only add variables to config.JSON that are needed by Save and Share. 
				this.config = dojo.eval("[" + config + "]")[0];	
				// Define global config not needed by Save and Share
				this.items = [];
				this.itemsFiltered = [];
				this.atRow = [];
				this.firstRun = "yes";
				this.url = "http://dev.services2.coastalresilience.org:6080/arcgis/rest/services/New_York/NY_CLIMAD_species/MapServer"
			},
			// Called after initialize at plugin startup (why all the tests for undefined). Also called after deactivate when user closes app by clicking X. 
			hibernate: function () {
				this.small = "yes";
				if (this.appDiv != undefined){
					$('#' + this.appDiv.id).hide();
					$('#' + this.appDiv.id + 'bottomDiv').hide();
					$('#' + this.appDiv.id + 'myLegendDiv').hide();
				}
				if (this.dynamicLayer != undefined)  {
					this.dynamicLayer.setVisibility(false);
					this.map.graphics.clear();
				}
				if (this.fc != undefined){
					this.fc.clear()
				}
				if (this.map != undefined){
					this.map.graphics.clear();
				}
				if (this.fcDraw != undefined){
					this.map.removeLayer(this.fcDraw);	
				}
				$('.legend').removeClass("hideLegend");
			},
			// Called after hibernate at app startup. Calls the render function which builds the plugins elements and functions.   
			activate: function () {
				// Hide framework default legend
				$('.legend').addClass("hideLegend");
				if (this.rendered == false) {
					this.rendered = true;							
					this.render();
					// Hide the print button until a hex has been selected
					$(this.printButton).hide();
					this.dynamicLayer.setVisibility(true);
				} else {
					if (this.dynamicLayer != undefined)  {
						this.dynamicLayer.setVisibility(true);	
						if ( this.map.getZoom() > 12 ){
							this.map.setLevel(12)	
						}	
					}
					if (this.fcDraw != undefined){
						this.map.addLayer(this.fcDraw);	
					}
					
				}
			},
			// Called when user hits the minimize '_' icon on the pluging. Also called before hibernate when users closes app by clicking 'X'.
			deactivate: function () {
				this.small = "no"
			},	
			// Called when user hits 'Save and Share' button. This creates the url that builds the app at a given state using JSON. 
			// Write anything to you config.json file you have tracked during user activity.		
			getState: function () {
				this.config.extent = this.map.geographicExtent;
				this.config.stateSet = "yes";
				// Get OBJECTIDs of filtered items
				if ( this.itemsFiltered.length > 0 ){
					$.each(this.itemsFiltered, lang.hitch(this,function(i,v){
						this.config.filteredIDs.push(v.OBJECTID)
					}));
				}	
				var state = new Object();
				state = this.config;
				return state;
			},
			// Called before activate only when plugin is started from a getState url. 
			//It's overwrites the default JSON definfed in initialize with the saved stae JSON.
			setState: function (state) {
				this.config = state;
			},
			// Called when the user hits the print icon
			beforePrint: function(printDeferred, $printArea, mapObject) {
				// Add hexagons
				var layer = new esri.layers.ArcGISDynamicMapServiceLayer(this.url);
				layer.setVisibleLayers([0])
				mapObject.addLayer(layer);
				// Add map graphics (selected hexagon) 
				mapObject.graphics.add(new esri.Graphic(this.fc.graphics[0].geometry, this.fc.graphics[0].symbol ));
				// Add content to printed page
				$printArea.append("<div id='title'>NY Species Report</div>")
                printDeferred.resolve();
            },	
			// Resizes the plugin after a manual or programmatic plugin resize so the button pane on the bottom stays on the bottom.
			// Tweak the numbers subtracted in the if and else statements to alter the size if it's not looking good.
			resize: function(w, h) {
				cdg = domGeom.position(this.container);
				if (cdg.h == 0) { this.sph = this.height - 80; }
				else { this.sph = cdg.h - 62; }
				domStyle.set(this.appDiv.domNode, "height", this.sph + "px"); 
			},
			// Called by activate and builds the plugins elements and functions
			render: function() {
				// Define Content Pane		
				this.appDiv = new ContentPane({style:'padding:8px 2px 8px 8px'});
				parser.parse();
				dom.byId(this.container).appendChild(this.appDiv.domNode);					
				// Get html from content.html, prepend appDiv.id to html element id's, and add to appDiv
				var idUpdate = content.replace(/id='/g, "id='" + this.appDiv.id);	
				$('#' + this.appDiv.id).html(idUpdate);
				// Custom legend
				// Get the parent element of the map for placement
				var a = $('#' + $(this.map).attr('id')).parent();
				// Use legend.html to build the elements in the ContentPane - update the ids with this.appDiv
				var legHTML = legendContent.replace(/id='/g, "id='" + this.appDiv.id);
				this.legendWin = new ContentPane({ id: this.appDiv.id + "myLegendDiv", innerHTML: legHTML	});
				// Add legend window to maps parent and add class for symbology
				dom.byId(a[0]).appendChild(this.legendWin.domNode)
				$('#' + this.appDiv.id + 'myLegendDiv').addClass('myLegendDiv');
				$('#' + this.appDiv.id + 'myLegendDiv').hide();
				// Make legend div movable
				var p = new ConstrainedMoveable( dom.byId(this.legendWin.id), {
					handle: dom.byId(this.appDiv.id + "myLegendHeader"), within: true
				});
				// Click handler to close legend
				$('#' + this.appDiv.id + 'myLegendDiv .myLegendCloser' ).on('click',lang.hitch(this,function(){
					$('#' + this.appDiv.id + 'myLegendDiv').hide();
				}));
				// Add dynamic map service
				this.dynamicLayer = new esri.layers.ArcGISDynamicMapServiceLayer(this.url, {opacity: 1 - this.config.sliderVal/10});
				this.map.addLayer(this.dynamicLayer);
				this.dynamicLayer.on("load", lang.hitch(this, function () {  
					if (this.config.extent == ""){
						if ( this.map.getZoom() > 12 ){
							this.map.setLevel(12)	
						}	
					}else{
						var extent = new esri.geometry.Extent(this.config.extent.xmin, this.config.extent.ymin, this.config.extent.xmax, this.config.extent.ymax, new esri.SpatialReference({ wkid:4326 }))
						this.map.setExtent(extent, true);
						this.config.extent = ""; 	
					}
					if (this.config.visibleLayers.length > 0){	
						this.dynamicLayer.setVisibleLayers(this.config.visibleLayers);
						this.spid = this.config.visibleLayers[0];	
					}
					this.layersArray = this.dynamicLayer.layerInfos;;
				}));				
				this.resize();
				// Create and handle transparency slider
				$('#' + this.appDiv.id + 'slider').slider({ min: 0,	max: 10, value: this.config.sliderVal });
				$('#' + this.appDiv.id + 'slider').on( "slidechange", lang.hitch(this,function( e, ui ) {
					this.config.sliderVal = ui.value;
					this.dynamicLayer.setOpacity(1 - ui.value/10);
				}));					
				// Enable jquery plugin 'chosen'
				require(["jquery", "plugins/community-rating-system/js/chosen.jquery"],lang.hitch(this,function($) {
					var config = { '.chosen-select'           : {allow_single_deselect:true, width:"138px", disable_search:true}}
					for (var selector in config) { $(selector).chosen(config[selector]); }
				}));	
				// Use selections on chosen menus to update this.config.filter object
				require(["jquery", "plugins/community-rating-system/js/chosen.jquery"],lang.hitch(this,function($) {			
					$('#' + this.appDiv.id + 'ch-CRS').chosen().change(lang.hitch(this,function(c, p){
						// Figure out which menu was selected
						var filterField = c.currentTarget.id.split("-").pop()
						console.log(filterField)
					}));
				}));
				// Clicks on showHide classes - expand and contract child div and switches out up and down arrow
				$('.showHide').on('click', lang.hitch(this,function(c){
					$(c.currentTarget).next().slideToggle();
					$(c.currentTarget).children().toggle();
				}));	
				// Main level checkbox clicks
				$('.crsCb').on('click', lang.hitch(this,function(c){
					var ct = c.currentTarget.id.split("-").pop()
					console.log(ct)
					var checked = c.currentTarget.checked
					if (ct == 'osp'){
						$('.step2').slideToggle();	
					}	
				}));	
				this.rendered = true;				
			},
			// Build legend from JSON request
			buildLegend: function(){
				// Refresh Legend div content and height and width
				var hmw = { height: '235px', minWidth: '150px' }	
				$('#' + this.appDiv.id + 'myLegendDiv').css(hmw);
				$('#' + this.appDiv.id + 'mySpeciesLegend').html('');
				$.getJSON( this.url +  "/legend?f=pjson&callback=?", lang.hitch(this,function( json ) {
					var speciesArray = [];
					//get legend pics
					$.each(json.layers, lang.hitch(this,function(i, v){
						if (v.layerName == this.config.sppcode){
							speciesArray.push(v)	
						}	
					}));
					// Set Title
					$('#' + this.appDiv.id + 'mySpeciesLegend').append("<div style='display:inline;text-decoration:underline;font-weight:bold;margin-top:5px;'>" + this.config.speciesRow + "</div><br>")
					// build legend items
					$.each(speciesArray[0].legend, lang.hitch(this,function(i, v){
						$('#' + this.appDiv.id + 'mySpeciesLegend').append("<p style='display:inline;'>" + v.label + "</p><img style='margin-bottom:-5px; margin-left:5px;' src='data:image/png;base64," + v.imageData + "' alt='Legend color'><br>")		
					})) 
					// Set legend div height and width
					var h = $('#' + this.appDiv.id + 'mySpeciesLegend').height() + 60;
					var w = $('#' + this.appDiv.id + 'mySpeciesLegend').width() + 30;
					var hw = { height: h + 'px', width: w + 'px' }	
					$('#' + this.appDiv.id + 'myLegendDiv').css(hw);
				})); 	
			}			
		});
	});						   