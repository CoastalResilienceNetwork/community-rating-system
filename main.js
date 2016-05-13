// Pull in your favorite version of jquery 
require({ 
	packages: [{ name: "jquery", location: "http://ajax.googleapis.com/ajax/libs/jquery/2.1.0/", main: "jquery.min" }] 
});
// Bring in dojo and javascript api classes as well as varObject.json and content.html
define([
	"esri/layers/ArcGISDynamicMapServiceLayer", "esri/geometry/Extent", "esri/SpatialReference", "esri/tasks/query", "esri/tasks/QueryTask",
	"esri/symbols/PictureMarkerSymbol", "dijit/TooltipDialog", "dijit/popup",
	"dojo/_base/declare", "framework/PluginBase", "esri/layers/FeatureLayer", "esri/symbols/SimpleLineSymbol", "esri/symbols/SimpleFillSymbol", "esri/lang", "esri/tasks/Geoprocessor",
	"esri/symbols/SimpleMarkerSymbol", "esri/graphic", "dojo/_base/Color", 	"dijit/layout/ContentPane", "dijit/form/HorizontalSlider", "dojo/dom", 
	"dojo/dom-class", "dojo/dom-style", "dojo/dom-construct", "dojo/dom-geometry", "dojo/_base/lang", "dojo/on", "dojo/parser", 'plugins/community-rating-system/js/ConstrainedMoveable',
	"dojo/text!./varObject.json", "jquery", "dojo/text!./html/legend.html", "dojo/text!./html/content.html", 'plugins/community-rating-system/js/jquery-ui-1.11.2/jquery-ui'
],
function ( ArcGISDynamicMapServiceLayer, Extent, SpatialReference, Query, QueryTask, PictureMarkerSymbol, TooltipDialog, dijitPopup,
	declare, PluginBase, FeatureLayer, SimpleLineSymbol, SimpleFillSymbol, esriLang, Geoprocessor, SimpleMarkerSymbol, Graphic, Color,
	ContentPane, HorizontalSlider, dom, domClass, domStyle, domConstruct, domGeom, lang, on, parser, ConstrainedMoveable, config, $, legendContent, content, ui ) {
		return declare(PluginBase, {
			// The height and width are set here when an infographic is defined. When the user click Continue it rebuilds the app window with whatever you put in.
			toolbarName: "Community Rating System", showServiceLayersInLegend: true, allowIdentifyWhenActive: false, rendered: false, resizable: false,
			hasCustomPrint: true, usePrintPreviewMap: true, previewMapSize: [1000, 550], height:"570", width:"425",
			infoGraphic: "<div style='padding:5px;width:600px;text-align: justify'> <div style='font-size: 120%;'>This application helps planners identify areas that are eligible for Open Space Preservation credits in <a target='_blank' href='https://www.fema.gov/national-flood-insurance-program-community-rating-system'>FEMA’s Community Rating System</a>(CRS) and provides exportable information to support the application process.* CRS is a voluntary program that encourages a more comprehensive approach to floodplain management and provides opportunities for communities to lower their flood insurance premiums by participating in activities that reduce flood damage to insurable property.</div><div><img src='plugins/community-rating-system/images/CRS_App_20160404.jpg'/></div> <div>* The information provided by this app does not represent a final analysis or score. All findings should be verified by your CRS ISO representative. Find your CRS representative<a target='_blank' href='http://crsresources.org/100-2/'>here.</a></div></div>",
			// First function called when the user clicks the pluging icon. 
			initialize: function (frameworkParameters) {
				// Access framework parameters
				declare.safeMixin(this, frameworkParameters);
				// Set initial app size based on split screen state
				this.con = dom.byId('plugins/community-rating-system-0');
				this.con1 = dom.byId('plugins/community-rating-system-1');
				if (this.con1 != undefined){
					domStyle.set(this.con1, "width", "425px");
					domStyle.set(this.con1, "height", "570px");
				}else{
					domStyle.set(this.con, "width", "425px");
					domStyle.set(this.con, "height", "570px");
				}	
				// Define object to access global variables from JSON object. Only add variables to varObject.json that are needed by Save and Share. 
				this.config = dojo.eval("[" + config + "]")[0];	
				// Define global config not needed by Save and Share
				this.config.url = "http://dev.services2.coastalresilience.org:6080/arcgis/rest/services/North_Carolina/NC_CRS/MapServer"
			},
			// Called after initialize at plugin startup (why all the tests for undefined). Also called after deactivate when user closes app by clicking X. 
			hibernate: function () {
				//$('.legend').removeClass("hideLegend");
				this.map.__proto__._params.maxZoom = 23;
				if (this.appDiv != undefined){
					$('#' + this.appDiv.id + 'ch-CRS').val('').trigger('chosen:updated');
					$('#' + this.appDiv.id + 'ch-CRS').trigger('change');
				}
			},
			// Called after hibernate at app startup. Calls the render function which builds the plugins elements and functions.   
			activate: function () {
				// Hide framework default legend
				//$('.legend').addClass("hideLegend");
				this.map.__proto__._params.maxZoom = 19;
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
				}
			},
			// Called when user hits the minimize '_' icon on the pluging. Also called before hibernate when users closes app by clicking 'X'.
			deactivate: function () {
				//$('.legend').removeClass("hideLegend");
			},	
			// Called when user hits 'Save and Share' button. This creates the url that builds the app at a given state using JSON. 
			// Write anything to you varObject.json file you have tracked during user activity.		
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
				var layer = new ArcGISDynamicMapServiceLayer(this.config.url, {opacity:0.5});
				layer.setVisibleLayers([7,10,11])  
				this.config.layerDefs[10] = this.config.crsDef
				this.config.layerDefs[11] = this.config.crsDef
				layer.setLayerDefinitions(this.config.layerDefs);
				mapObject.addLayer(layer);
				// Add map graphics	
				mapObject.graphics.add(new Graphic(this.crsFL.graphics[0].geometry, this.crsFL.graphics[0].symbol ));				
				$.each(this.parcelsFL.graphics, lang.hitch(this,function(i,v){
					mapObject.graphics.add(new Graphic(this.parcelsFL.graphics[i].geometry, this.parcelsFL.graphics[i].symbol ));	
				}));
				// Add content to printed page
				$printArea.append("<div id='title'>" + this.config.crsSelected + "</div>")
				//$printArea.append("<div id='summary' class='printSummary'>" + $('#' + this.appDiv.id + 'printSummary').html() + "</div>")
				$printArea.append("<div id='tableWrapper'><div id='tableTitle'>Selected Parcels</div><table id='table' class='printTable'>" + $('#' + this.appDiv.id + 'myPrintTable').html() + "</table></div>");
			
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
				this.appDiv = new ContentPane({style:'padding:8px 8px 8px 8px'});
				parser.parse();
				dom.byId(this.container).appendChild(this.appDiv.domNode);					
				// Get html from content.html, prepend appDiv.id to html element id's, and add to appDiv
				var idUpdate = content.replace(/id='/g, "id='" + this.appDiv.id);	
				$('#' + this.appDiv.id).html(idUpdate);
				// set up accordian
				$('#' + this.appDiv.id + 'dlAccord').accordion({
					collapsible: true,
					active: 0,
					heightStyle: "content"
				});
				$('#' + this.appDiv.id + 'dlAccord1').accordion({
					collapsible: true,
					active: 0,
					heightStyle: "content"
				});
				$('#' + this.appDiv.id + 'parAccord').accordion({
					collapsible: false,
					active: 0,
					heightStyle: "content"
				});
				// Handle clicks on home screen
				$('#' + this.appDiv.id + 'ospAppBtn').on('click',lang.hitch(this,function(){
					this.config.section = "dl";
					$('#' + this.appDiv.id + 'topHeader').html($('#' + this.appDiv.id + 'ospAppBtn').html());
					$('#' + this.appDiv.id + 'home').slideUp();
					$('#' + this.appDiv.id + 'topWrapper, #' + this.appDiv.id + 'dlOspWrapper').slideDown();
				}));
				$('#' + this.appDiv.id + 'parcelByIdBtn').on('click',lang.hitch(this,function(){
					this.config.section = "pin";
					$('#' + this.appDiv.id + 'topHeader').html($('#' + this.appDiv.id + 'parcelByIdBtn').html());
					$('#' + this.appDiv.id + 'home').slideUp();
					$('#' + this.appDiv.id + 'topWrapper, #' + this.appDiv.id + 'dlOspWrapper').slideDown();
				}));				
				// Home button clicks
				$('#' + this.appDiv.id + 'homeBtn').on('click',lang.hitch(this,function(){
					this.map.setExtent(this.dynamicLayer.initialExtent, true); 
					this.config.visibleLayers = [];
					this.config.visibleLayers1 = [];
					this.dynamicLayer.setVisibleLayers(this.config.visibleLayers);
					this.dynamicLayer1.setVisibleLayers(this.config.visibleLayers1);
					//$('.legend').addClass("hideLegend");					
					$('#' + this.appDiv.id + 'ch-CRS').val('').trigger('chosen:updated');
					$('#' + this.appDiv.id + 'ch-CRS').trigger('change');
					$('#'  + this.appDiv.id + 'topWrapper, #' + this.appDiv.id + 'dlOspWrapper, #' + this.appDiv.id + 'step2, #' + this.appDiv.id + 'printWrapper').slideUp();
					$('#' + this.appDiv.id + 'home').slideDown();
				}));
				// Copy of dynamic layer for transparency slider
				this.dynamicLayer1 = new ArcGISDynamicMapServiceLayer(this.config.url, {opacity: 1 - this.config.sliderVal/10});
				this.map.addLayer(this.dynamicLayer1);
				this.dynamicLayer1.on("load", lang.hitch(this, function () {  
					if (this.config.visibleLayers1.length > 0){	
						this.dynamicLayer1.setVisibleLayers(this.config.visibleLayers1);
					}
				}));				
				// Add dynamic map service
				this.dynamicLayer = new ArcGISDynamicMapServiceLayer(this.config.url);
				this.map.addLayer(this.dynamicLayer);
				this.dynamicLayer.on("load", lang.hitch(this, function () {  
					if (this.config.extent == ""){
						//this.map.setExtent(this.dynamicLayer.initialExtent, true);	
					}else{
						var extent = new Extent(this.config.extent.xmin, this.config.extent.ymin, this.config.extent.xmax, this.config.extent.ymax, new SpatialReference({ wkid:4326 }))
						this.map.setExtent(extent, true);
						this.config.extent = ""; 	
					}
					if (this.config.visibleLayers.length > 0){	
						this.dynamicLayer.setVisibleLayers(this.config.visibleLayers);
						this.spid = this.config.visibleLayers[0];	
					}
					this.layersArray = this.dynamicLayer.layerInfos;
				}));
				this.dynamicLayer.on("update-end", lang.hitch(this,function(e){
					if (e.target.visibleLayers.length > 0){
						$('#' + this.appDiv.id + 'bottomDiv').show();	
					}else{
						$('#' + this.appDiv.id + 'bottomDiv').hide();	
					}
				}));
				// Create a QueryTask for PIN search
				this.pinQt = new QueryTask(this.config.url + "/6");
				// red selection symbol
				var selSymbol = new SimpleFillSymbol( SimpleFillSymbol.STYLE_SOLID, new SimpleLineSymbol(
					SimpleLineSymbol.STYLE_SOLID, new Color([255,0,0]), 2 ), new Color([255,255,255,0])
				);
				// Create a feature layer of parcel selected by PIN
				this.pinFL = new FeatureLayer(this.config.url + "/6", { mode: FeatureLayer.MODE_SELECTION, outFields: ["*"] });
				this.pinFL.setSelectionSymbol(selSymbol);
				this.pinFL.on('selection-complete', lang.hitch(this,function(evt){
					if (this.pinTracker == "yes"){
						this.pinTracker = "zcheck"
						var pinExtent = evt.features[0].geometry.getExtent();
						this.map.setExtent(pinExtent, true);
					}
				}));	
				// Track extent changes for pin zooms
				this.pinTracker = "no"			
				// Create a feature layer of the selected layer and add mouseover, mouseout, and click listeners
				this.crsFL = new FeatureLayer(this.config.url + "/0", { mode: FeatureLayer.MODE_SELECTION, outFields: ["*"] });
				//this.crsFL.setSelectionSymbol(selSymbol);
				this.crsFL.on('selection-complete', lang.hitch(this,function(evt){
					// Get and zoom to extent of selected feature
					var crsExtent = evt.features[0].geometry.getExtent();				
					this.map.setExtent(crsExtent, true); 
					// Get attributes of selected feature
					this.atts = evt.features[0].attributes;
					// User clicked download section on home page
					if (this.config.section == "dl"){
						// Loop through all elements with class s0Atts in the step0 div and use their IDs to show selected features attributes
						$('#' + this.appDiv.id + 'step0 .s0Atts').each(lang.hitch(this,function (i,v){
							var field = v.id.split("-").pop()
							var val = this.atts[field]
							if ( isNaN(this.atts[field]) == false ){
								val = Math.round(val);
								val = commaSeparateNumber(val);
							}	
							$('#' + v.id).html(val)
						}));
						// Loop through all elements with class s2Atts in the step1 div and use their IDs to show selected features attributes
						$('#' + this.appDiv.id + 'step2 .s2Atts').each(lang.hitch(this,function (i,v){
							var field = v.id.split("-").pop()
							var val = this.atts[field]
							if ( isNaN(this.atts[field]) == false ){
								val = Math.round(val);
								val = commaSeparateNumber(val);
							}	
							$('#' + v.id).html(val)
						}));
						// Update bar graphs values - get cur and potential points
						this.n = [this.atts.OSP_PTS_2013, this.atts.SUM_ALL_cpts]
						// find the remaining value so bar numbers can be calculated as percentages
						var m = 2020 - (this.n[0] + this.n[1])
						this.n.push(m)
						// Create empty array and populate it with percentages of current, potential, and remaining
						var p = [];
						$.each(this.n, lang.hitch(function(i,v){
							x = Math.round(v/2020*100);
							p.push(x);
						}));
						// Update bar values with percentages array
						$('#' + this.appDiv.id + 'bar2').animate({left : p[0]+"%", width: p[1]+"%"});
						$('#' + this.appDiv.id + 'bar1').animate({left : "0%", width: p[0]+"%"});
						// Add labels to current and potential bars (round decimals and add commas as necessary)
						if (isNaN(this.atts.OSP_PTS_2013) == false){
							var curPnts = Math.round(this.atts.OSP_PTS_2013);
							curPnts = commaSeparateNumber(curPnts);
							$('#' + this.appDiv.id + 'bar1L').html(curPnts)
						}	
						if (isNaN(this.atts.SUM_ALL_cpts) == false){
							var potPnts = Math.round(this.atts.SUM_ALL_cpts);
							potPnts = commaSeparateNumber(potPnts);
							$('#' + this.appDiv.id + 'bar2L').html(potPnts);
						}
					}	
				}));	
				//this.map.addLayer(this.crsFL);
				this.map.addLayer(this.pinFL);
				this.resize();
				// Setup hover window for 20 largest parcels (as points)
				this.map.infoWindow.resize(225,125);
        		this.dialog = new TooltipDialog({
				  id: "tooltipDialog",
				  style: "position: absolute; width: 230px; font: normal normal normal 10pt Helvetica;z-index:100"
				});
				this.dialog.startup();
				// Create a feature layer to select the 20 largest parcels
				this.parcelsFL = new FeatureLayer(this.config.url + "/14", { mode: FeatureLayer.MODE_SELECTION, outFields: ["*"] });
				this.parcelsFL.on('selection-complete', lang.hitch(this,function(evt){
					this.labels = "stop";
					// First selection based on user filters
					if (this.parcelStep == "one"){
						this.features = evt.features;
						// If more than 20 features returned then reselect by the same query plus >= the 20th biggest layer
						if (this.features.length > 20){
							// Sort selected features by acres descending
							this.features.sort(function(a,b){
								return b.attributes.OSP_LU_cac - a.attributes.OSP_LU_cac; 
							})
							var q = new Query();
							q.where = this.config.layerDefs[7] + " AND OSP_LU_cac >=" + this.features[19].attributes.PARCEL_AC;
							this.parcelStep = "two";
							this.parcelsFL.selectFeatures(q,FeatureLayer.SELECTION_NEW);
						}else{
							// the orignial selection had less than 20 features - define a variable to start feature labeling
							this.labels = "go";
						}		
					}else{
						// second selection than reduces original selection down to 20 features
						this.parcelStep = "one";
						// set variable to start feature labeling
						this.labels = "go"; 
					}	
					if (this.labels == "go"){
						this.features = this.parcelsFL.getSelectedFeatures()	
						this.features.sort(function(a,b){
							return b.attributes.OSP_LU_cac - a.attributes.OSP_LU_cac; 
						})
						this.updatePrintTable(this.features);
						$.each(this.features, lang.hitch(this,function(i,v){
							var num = i + 1;
							var symbol = new PictureMarkerSymbol('plugins/community-rating-system/images/numbers/point' + num + '_.png', 20, 20);
							v.setSymbol(symbol)
						}));	
					}
				}));
				this.map.addLayer(this.parcelsFL);
				this.parcelsFL.on("mouse-over", lang.hitch(this,function(evt){
					var un = evt.graphic.symbol.url.indexOf("_")
					n = evt.graphic.symbol.url.substring(52,un)
					if (n != this.pntSel){
						var symbol =  new esri.symbol.PictureMarkerSymbol("plugins/community-rating-system/images/numbers/point" + n + "_h.png", 22, 22)
						evt.graphic.setSymbol(symbol)
					}	
					this.map.setMapCursor("pointer");
				}));
				this.parcelsFL.on("mouse-out", lang.hitch(this,function(evt){
					var un = evt.graphic.symbol.url.indexOf("_")
					n = evt.graphic.symbol.url.substring(52,un)
					if (n != this.pntSel){
						var symbol = new esri.symbol.PictureMarkerSymbol("plugins/community-rating-system/images/numbers/point" + n + "_.png", 20, 20)
						evt.graphic.setSymbol(symbol)
					}
					this.map.setMapCursor("default");
				}));
				this.parcelsFL.on("click", lang.hitch(this,function(evt){
					var un = evt.graphic.symbol.url.indexOf("_")
					n = evt.graphic.symbol.url.substring(52,un)
					this.pntSel = n;
					this.features = this.parcelsFL.getSelectedFeatures()
					this.features.sort(function(a,b){
						return b.attributes.OSP_LU_cac - a.attributes.OSP_LU_cac; 
					})
					$.each(this.features, lang.hitch(this,function(i,v){
						var num = i + 1;
						var symbol = new PictureMarkerSymbol('plugins/community-rating-system/images/numbers/point' + num + '_.png', 20, 20);
						v.setSymbol(symbol)
					}));
					var symbol =  new esri.symbol.PictureMarkerSymbol("plugins/community-rating-system/images/numbers/point" + n + "_s.png", 24, 24)
					evt.graphic.setSymbol(symbol)
					this.map.setMapCursor("help");
					var t = "<div class='myTooltip'><b>Parcel ID:</b> ${PIN}<span id='" + this.appDiv.id + "infoClick' class='closePup'>X</span><br>" 
						+ "<b>Eligible Acres: </b>${OSP_LU_cac:NumberFormat}<br>"
						+ "<b>Owner Type: </b>${OWNER_TYPE}<br>"
						+ "<b>Description: </b>${OSP_DESC}<hr class='puHr'>"
						+ "<span id='" + this.appDiv.id + "removeParcel' class='removeParcel'>Remove this Parcel</span></div>";
					var content = esriLang.substitute(evt.graphic.attributes,t);
					this.dialog.setContent(content);
					domStyle.set(this.dialog.domNode, "opacity", 0.85);
					dijitPopup.open({
						popup: this.dialog, 
						x: evt.pageX,
						y: evt.pageY
					});
					$('#' + this.appDiv.id + 'infoClick' ).on('click', lang.hitch(this,function(){
						dijitPopup.close(this.dialog);	
						this.pntSel = -1;
						this.features = this.parcelsFL.getSelectedFeatures()
						this.features.sort(function(a,b){
							return b.attributes.OSP_LU_cac - a.attributes.OSP_LU_cac; 
						})
						$.each(this.features, lang.hitch(this,function(i,v){
							var num = i + 1;
							var symbol = new PictureMarkerSymbol('plugins/community-rating-system/images/numbers/point' + num + '_.png', 20, 20);
							v.setSymbol(symbol)
						}));
					}));
					$('#' + this.appDiv.id + 'removeParcel' ).on('click', lang.hitch(this,function(evt){
						$('#' + this.appDiv.id + 'undoRemove').slideDown();
						this.features = this.parcelsFL.getSelectedFeatures()
						this.features.sort(function(a,b){
							return b.attributes.OSP_LU_cac - a.attributes.OSP_LU_cac; 
						})
						this.config.excludeArray.push(this.features[this.pntSel - 1].attributes.PIN)
						$('#' + this.appDiv.id + 'numRemoved').html(this.config.excludeArray.length);
						this.dropPins = "";
						$.each(this.config.excludeArray, lang.hitch(this,function(i,v){
							if (i == 0){
								this.dropPins = "'" + v + "'";
							}else{
								this.dropPins = this.dropPins + ", '" + v + "'";
							}			
						}));
						this.config.excludeDef = " AND PIN NOT IN (" + this.dropPins + ")";
						this.config.layerDefs[7] = this.config.crsDef + this.config.ownerDef + this.config.acresDef  + this.config.descDef + this.config.excludeDef;
						this.config.layerDefs[6] = this.config.crsDef + this.config.ownerDef + this.config.acresDef  + this.config.descDef + this.config.excludeDef;
						dijitPopup.close(this.dialog);
						this.dynamicLayer.setLayerDefinitions(this.config.layerDefs);
						this.dynamicLayer1.setLayerDefinitions(this.config.layerDefs);
						$('#' + this.appDiv.id + 'selectParcels').trigger('click');
					}));	
				}));
				$('#' + this.appDiv.id + 'undoRemove' ).on('click', lang.hitch(this,function(evt){				
					this.config.excludeArray.pop()
					if (this.config.excludeArray.length == 0){
						this.config.excludeDef = "";
						$('#' + this.appDiv.id + 'undoRemove' ).slideUp();
					}else{
						$('#' + this.appDiv.id + 'numRemoved').html(this.config.excludeArray.length);						
						this.dropPins = "";
						$.each(this.config.excludeArray, lang.hitch(this,function(i,v){
							if (i == 0){
								this.dropPins = "'" + v + "'";
							}else{
								this.dropPins = this.dropPins + ", '" + v + "'";
							}			
						}));
						this.config.excludeDef = " AND PIN NOT IN (" + this.dropPins + ")";
					}	
					this.config.layerDefs[6] = this.config.crsDef + this.config.ownerDef + this.config.acresDef  + this.config.descDef + this.config.excludeDef;
					this.config.layerDefs[7] = this.config.crsDef + this.config.ownerDef + this.config.acresDef  + this.config.descDef + this.config.excludeDef;
					this.dynamicLayer.setLayerDefinitions(this.config.layerDefs);
					this.dynamicLayer1.setLayerDefinitions(this.config.layerDefs);
					$('#' + this.appDiv.id + 'selectParcels').trigger('click');
				}));
				$('#' + this.appDiv.id + 'selectParcels').on('click', lang.hitch(this,function(c){
					this.config.selectParcels = "yes";
					var q = new Query();
					q.where = this.config.layerDefs[6,7];
					this.parcelStep = "one";
					this.parcelsFL.selectFeatures(q,FeatureLayer.SELECTION_NEW);
					$('#' + this.appDiv.id + 'selectParcels').hide();
					$('#' + this.appDiv.id + 'hideParcels').show();
					$(this.printButton).show();
				}));
				$('#' + this.appDiv.id + 'hideParcels').on('click', lang.hitch(this,function(c){
					this.hideParcelLabels();
				}));
				// Create and handle transparency slider
				$('.smallLegends').css('opacity', 1 - this.config.sliderVal/10);
				$('#' + this.appDiv.id + 'slider').slider({ min: 0,	max: 10, value: this.config.sliderVal });
				$('#' + this.appDiv.id + 'slider').on( "slidechange", lang.hitch(this,function( e, ui ) {
					this.config.sliderVal = ui.value;
					this.dynamicLayer1.setOpacity(1 - ui.value/10);
					$('.smallLegends').css('opacity', 1 - ui.value/10);
				}));					
				// Enable jquery plugin 'chosen'
				require(["jquery", "plugins/community-rating-system/js/chosen.jquery"],lang.hitch(this,function($) {
					var configCrs =  { '.chosen-crs' : {allow_single_deselect:true, width:"200px", disable_search:true}}
					var configPin =  { '.chosen-pin' : {allow_single_deselect:true, width:"200px", search_contains:true}}
					for (var selector in configCrs)  { $(selector).chosen(configCrs[selector]); }
					for (var selector in configPin)  { $(selector).chosen(configPin[selector]); }
				/*	var config1 = { '.chosen-select1': {allow_single_deselect:true, width:"190px", disable_search:true}}
					var config2 = { '.chosen-select2': {allow_single_deselect:true, width:"190px", disable_search:true}}
					var config3 = { '.chosen-select3': {allow_single_deselect:true, width:"260px", disable_search:true}}
					for (var selector in config1) { $(selector).chosen(config1[selector]); }
					for (var selector in config2) { $(selector).chosen(config2[selector]); }
					for (var selector in config3) { $(selector).chosen(config3[selector]); } */
				}));	
				// Use selections on chosen menus 
				require(["jquery", "plugins/community-rating-system/js/chosen.jquery"],lang.hitch(this,function($) {			
					//Select CRS 
					$('#' + this.appDiv.id + 'ch-CRS').chosen().change(lang.hitch(this,function(c, p){
						this.clearItems();
						// something was selected
						if (p) {
							this.config.crsSelected = c.currentTarget.value;
							this.config.crsNoSpace = c.currentTarget.value.replace(/\s+/g, '');
							// use selected community to query community layer 	
							var q = new Query();
							q.where = "CRS_NAME = '" + this.config.crsSelected + "'";
							this.crsFL.selectFeatures(q,FeatureLayer.SELECTION_NEW);
							$('#' + this.appDiv.id + 'printAnchorDiv').empty();
							// User clicked download section on home page
							if (this.config.section == "dl"){
								this.config.crsSelUnderscore = this.config.crsSelected.replace(/ /g,"_");
								$('#' + this.appDiv.id + 'allParLink').show();
								$('#' + this.appDiv.id + 'larParLink').show();
								$('#' + this.appDiv.id + 'ceosLink').show();
								$('#' + this.appDiv.id + 'sbLink').show();
								$('#' + this.appDiv.id + 'csvDesc').show();
								if (this.config.crsSelected == "Duck NC"){
									$('#' + this.appDiv.id + 'allParLink').hide();
									$('#' + this.appDiv.id + 'larParLink').hide();
									$('#' + this.appDiv.id + 'csvDesc').hide();
								}
								if (this.config.crsSelected == "Manteo NC"){
									$('#' + this.appDiv.id + 'ceosLink').hide();
								}	
								$('#' + this.appDiv.id + 'downloadDiv').slideDown();
								// Set layer defs on layers id's in dlSspLayers array
								$.each(this.config.dlOspLayers1, lang.hitch(this,function(i,v){
									this.config.layerDefs[v] = "CRS_NAME = '" + this.config.crsSelected + "'"
								})); 							 
								this.dynamicLayer.setLayerDefinitions(this.config.layerDefs);
								this.dynamicLayer1.setLayerDefinitions(this.config.layerDefs);
								$('#' + this.appDiv.id + 'step0, #' + this.appDiv.id + 'step1, #' + this.appDiv.id + 'step2').slideDown();
								this.config.visibleLayers = this.config.dlOspLayers;
								this.config.visibleLayers1 = this.config.transLayer;
								this.dynamicLayer.setVisibleLayers(this.config.visibleLayers);
								this.dynamicLayer1.setVisibleLayers(this.config.visibleLayers1);
								//$('.legend').removeClass("hideLegend");
							}
							if (this.config.section == "pin"){
								// placeholder for Community with no OSP parcels (used to be Duck)
								if (this.config.crsSelected == "NP Community"){
									$('#' + this.appDiv.id + 'ch-PIN').prop( "disabled", true );
									$('#' + this.appDiv.id + 'ch-PIN').attr("data-placeholder", "No Parcels");
									$('#' + this.appDiv.id + 'hasParcelsDiv').hide();
									$('#' + this.appDiv.id + 'noParcelsDiv').show();
								}else{
									$('#' + this.appDiv.id + 'ch-PIN').prop( "disabled", false );
									$('#' + this.appDiv.id + 'ch-PIN').attr("data-placeholder", "Find Parcel by PIN");
									$('#' + this.appDiv.id + 'hasParcelsDiv').show();
									$('#' + this.appDiv.id + 'noParcelsDiv').hide();
								}			
								$('#' + this.appDiv.id + 'ch-PIN').trigger("chosen:updated");
								//$('#' + this.appDiv.id + 'crsNameParcel').html(this.config.crsSelected)
								// Set layer defs on layers id's in dlSspLayers array
								$.each(this.config.pinLayers1, lang.hitch(this,function(i,v){
									this.config.layerDefs[v] = "CRS_NAME = '" + this.config.crsSelected + "'"
								})); 							 
								this.dynamicLayer.setLayerDefinitions(this.config.layerDefs);
								this.dynamicLayer1.setLayerDefinitions(this.config.layerDefs);
								this.config.visibleLayers = this.config.pinLayers;
								this.config.visibleLayers1 = this.config.transLayer;
								this.dynamicLayer.setVisibleLayers(this.config.visibleLayers);
								this.dynamicLayer1.setVisibleLayers(this.config.visibleLayers1);
								//$('.legend').removeClass("hideLegend");
								// select all parcels in tax district
								var q = new Query();
								q.returnGeometry = false;
								q.outFields = ["PIN"];
								q.where = "CRS_NAME = '" + this.config.crsSelected + "'";
								this.pinQt.execute(q, lang.hitch(this,function(evt){
									$('body').addClass('waiting');
									$('#' + this.appDiv.id + 'ch-PIN').empty();
									$('#' + this.appDiv.id + 'ch-PIN').append("<option value=''></option>");
									this.f = evt.features;
									$.each(this.f, lang.hitch(this,function(i,v){
										var pin = v.attributes.PIN;
										$('#' + this.appDiv.id + 'ch-PIN').append("<option value='"+pin+"'>"+pin+"</option>");
									}));
									$('#' + this.appDiv.id + 'ch-PIN').trigger("chosen:updated");
									$('#' + this.appDiv.id + 'printWrapper').slideDown();
									$('body').removeClass('waiting');
								}));
							}	
						}
						// selection was cleared
						else{	
							this.crsFL.clear();
							this.config.visibleLayers = [];
							this.config.visibleLayers1 = [];
							this.dynamicLayer.setVisibleLayers(this.config.visibleLayers);
							this.dynamicLayer1.setVisibleLayers(this.config.visibleLayers1);
							//$('.legend').addClass("hideLegend");	
							$('#' + this.appDiv.id + 'step0, #' + this.appDiv.id + 'step1, #' + this.appDiv.id + 'step2, #' + this.appDiv.id + 'step3').slideUp();
							$('#' + this.appDiv.id + 'printWrapper').slideUp();
							$('#' + this.appDiv.id + 'step2 .gExp, #' + this.appDiv.id + 'step1 .sumText, #' + this.appDiv.id + 'step1 .parView').show();
							$('#' + this.appDiv.id + 'step2 .gCol, #' + this.appDiv.id + 'step2 .infoOpen, #' + this.appDiv.id + 'step1 .parText, #' + this.appDiv.id + 'step1 .sumView').hide();
						}
					}));
					$('#' + this.appDiv.id + 'ch-PIN').chosen().change(lang.hitch(this,function(c, p){
						if (p){
							this.pinSelected = c.currentTarget.value;
							var q = new Query();
							q.where = "CRS_NAME = '" + this.config.crsSelected + "' AND PIN = '" + this.pinSelected + "'";
							this.pinFL.selectFeatures(q,FeatureLayer.SELECTION_NEW);
							$('#' + this.appDiv.id + 'ch-PIN').attr("data-placeholder", "Select More Parcels");
							$("#" + this.appDiv.id + "ch-PIN option[value='" + this.pinSelected + "']").remove();
							if ($('#' + this.appDiv.id + 'ch-PIN option').size() == 1){
								$('#' + this.appDiv.id + 'ch-PIN').attr("data-placeholder", "No More Parcels");
								$('#' + this.appDiv.id + 'ch-PIN').prop( "disabled", true );
							}	
							$('#' + this.appDiv.id + 'ch-PIN').trigger("chosen:updated");
							this.zoomSelectedClass()
							$('#' + this.appDiv.id + 'printAnchorDiv').append(
								"<div class='pinPDFdiv zoomSelected'>" +
									this.pinSelected + ": " + 
									"<a class='pinPDFLinks' id='" + this.appDiv.id + "m-" + this.pinSelected + "'>View Map</a>" +
									" | " + 
									"<a class='pinZoomLinks' id='" + this.appDiv.id + "z-" + this.pinSelected + "'>Zoom</a>" +
								"</div>"
							);	
							$('.pinPDFLinks').on('click',lang.hitch(this,function(e){
								this.zoomSelectedClass(e.currentTarget.parentElement)
								var pin = e.currentTarget.id.split("-").pop()
								window.open("http://crs-maps.coastalresilience.org/" + this.config.crsNoSpace + "_" + pin + ".pdf", "_blank");
							}));	
							$('.pinZoomLinks').on('click',lang.hitch(this,function(e){
								this.pinTracker = "yes"
								var pin = e.currentTarget.id.split("-").pop()
								var q = new Query();
								q.where = "CRS_NAME = '" + this.config.crsSelected + "' AND PIN = '" + pin + "'";
								this.pinFL.selectFeatures(q,FeatureLayer.SELECTION_NEW);	
								this.zoomSelectedClass(e.currentTarget.parentElement)
							}));
						}
					}));	
					// Select Owner Type filter
					$('#' + this.appDiv.id + 'ch-OWNER_TYPE').chosen().change(lang.hitch(this,function(c, p){
						if (p) {
							this.config.ownerDef = " AND OWNER_TYPE='" + c.currentTarget.value + "'";
							$.each( ($('#' + this.appDiv.id + 'step3').find('.parcelsCB')), lang.hitch(this,function(i,v){		
								$.each(this.layersArray, lang.hitch(this,function(j,w){
									if (w.name == v.value){
										this.config.layerDefs[w.id] = this.config.crsDef + this.config.ownerDef + this.config.acresDef + this.config.descDef + this.config.excludeDef;
									}	
								}));
							}));
							this.dynamicLayer.setLayerDefinitions(this.config.layerDefs);
						}else{
							this.config.ownerDef = "";
							$.each( ($('#' + this.appDiv.id + 'step3').find('.parcelsCB')), lang.hitch(this,function(i,v){	
								$.each(this.layersArray, lang.hitch(this,function(j,w){
									if (w.name == v.value){
										this.config.layerDefs[w.id] = this.config.crsDef + this.config.ownerDef + this.config.acresDef + this.config.descDef + this.config.excludeDef;
									}	
								}));
							}));
							this.dynamicLayer.setLayerDefinitions(this.config.layerDefs);
						}
						if (this.config.selectParcels == "yes"){
							$('#' + this.appDiv.id + 'selectParcels').trigger('click');
						}
					}));
					// Select Parcel Description filter
					$('#' + this.appDiv.id + 'ch-OSP_DESC').chosen().change(lang.hitch(this,function(c, p){
						if (p) {
							this.config.descDef = " AND OSP_DESC='" + c.currentTarget.value + "'";
							$.each( ($('#' + this.appDiv.id + 'step3').find('.parcelsCB')), lang.hitch(this,function(i,v){		
								$.each(this.layersArray, lang.hitch(this,function(j,w){
									if (w.name == v.value){
										this.config.layerDefs[w.id] = this.config.crsDef + this.config.ownerDef + this.config.acresDef + this.config.descDef + this.config.excludeDef;
									}	
								}));
							}));
							this.dynamicLayer.setLayerDefinitions(this.config.layerDefs);
						}else{
							this.config.descDef = "";
							$.each( ($('#' + this.appDiv.id + 'step3').find('.parcelsCB')), lang.hitch(this,function(i,v){	
								$.each(this.layersArray, lang.hitch(this,function(j,w){
									if (w.name == v.value){
										this.config.layerDefs[w.id] = this.config.crsDef + this.config.ownerDef + this.config.acresDef + this.config.descDef + this.config.excludeDef;
									}	
								}));
							}));
							this.dynamicLayer.setLayerDefinitions(this.config.layerDefs);
						}
						if (this.config.selectParcels == "yes"){
							$('#' + this.appDiv.id + 'selectParcels').trigger('click');
						}						
					}));
					// Select greater than or less than	acres	
					$('#' + this.appDiv.id + 'ch-PARCEL_AC').chosen().change(lang.hitch(this,function(c, p){
						if (p){
							this.gTlT = c.currentTarget.value;
							$('#' + this.appDiv.id + 'parcelAcresDiv').show();
							if (this.config.acresValue.length > 0){
								this.config.acresDef = " AND PARCEL_AC" + this.gTlT + this.config.acresValue;
								$.each( ($('#' + this.appDiv.id + 'step3').find('.parcelsCB')), lang.hitch(this,function(i,v){		
									$.each(this.layersArray, lang.hitch(this,function(j,w){
										if (w.name == v.value){
											this.config.layerDefs[w.id] = this.config.crsDef + this.config.ownerDef + this.config.acresDef + this.config.descDef + this.config.excludeDef;
										}	
									}));
								}));
								this.dynamicLayer.setLayerDefinitions(this.config.layerDefs);
							}	
						}else{
							$('#' + this.appDiv.id + 'parcelAcres').val('');
							this.config.acresDef = "";
							this.config.acresValue = "";
							$('#' + this.appDiv.id + 'parcelAcresDiv').hide();
							$('#' + this.appDiv.id + 'acreText').hide();
							$('#' + this.appDiv.id + 'parcelAcres').css('border', '1pt solid #ccc');
							this.config.acresDef = "";
							$.each( ($('#' + this.appDiv.id + 'step3').find('.parcelsCB')), lang.hitch(this,function(i,v){	
								$.each(this.layersArray, lang.hitch(this,function(j,w){
									if (w.name == v.value){
										this.config.layerDefs[w.id] = this.config.crsDef + this.config.ownerDef + this.config.acresDef + this.config.descDef + this.config.excludeDef;
									}	
								}));
							}));
							this.dynamicLayer.setLayerDefinitions(this.config.layerDefs);
							if (this.config.selectParcels == "yes"){
								$('#' + this.appDiv.id + 'selectParcels').trigger('click');
							}
						}						
					}));	
				}));
					
				// Preview download maps
				$('#' + this.appDiv.id + 'allParcelPreview').on('click',lang.hitch(this,function(){
					window.open("http://crs-maps.coastalresilience.org/" + this.config.crsNoSpace + "_AllParcels.pdf", "_blank");
				}));
				$('#' + this.appDiv.id + 'largeParcelPreview').on('click', lang.hitch(this,function(){
					window.open("http://crs-maps.coastalresilience.org/" + this.config.crsNoSpace + "_Parcels_Large.pdf", "_blank");					
				}));
				$('#' + this.appDiv.id + 'setbackParcelPreview').on('click', lang.hitch(this,function(){
					window.open("http://crs-maps.coastalresilience.org/" + this.config.crsNoSpace + "_Setbacks.pdf", "_blank");					
				}));
				$('#' + this.appDiv.id + 'ceosParcelPreview').on('click', lang.hitch(this,function(){
					window.open("http://crs-maps.coastalresilience.org/" + this.config.crsNoSpace + "_CEOS.pdf", "_blank");					
				}));
				// Data download click
				$('#' + this.appDiv.id + 'dlBtn').on('click', lang.hitch(this,function(){
					window.open("http://crs-maps.coastalresilience.org/" + this.config.crsNoSpace + "_Maps.zip", "_parent");
				}));
				// Print by PIN
										
				// Parcel acres input change listener
				$('#' + this.appDiv.id + 'parcelAcres').on('keyup', lang.hitch(this,function(c){
					this.config.acresValue = c.currentTarget.value;
					if (c.currentTarget.value.length > 0){
						// Invalid character entered - not a number
						if ( isNaN(c.currentTarget.value)){
							$('#' + this.appDiv.id + 'parcelAcres').css('border', '1pt solid red');
							$('#' + this.appDiv.id + 'acreText').show();
						}
						// number entered - build definition and apply to parcel layers
						else {
							$('#' + this.appDiv.id + 'acreText').hide();
							$('#' + this.appDiv.id + 'parcelAcres').css('border', '1pt solid #ccc');
							this.config.acresDef = " AND PARCEL_AC" + this.gTlT + " " + c.currentTarget.value;
							$.each( ($('#' + this.appDiv.id + 'step3').find('.parcelsCB')), lang.hitch(this,function(i,v){		
								$.each(this.layersArray, lang.hitch(this,function(j,w){
									if (w.name == v.value){
										this.config.layerDefs[w.id] = this.config.crsDef + this.config.ownerDef + this.config.acresDef + this.config.descDef + this.config.excludeDef;
									}	
								}));
							}));
							this.dynamicLayer.setLayerDefinitions(this.config.layerDefs);
							this.dynamicLayer1.setLayerDefinitions(this.config.layerDefs);
						}
					// nothing entered in input - reset definition 
					}else{
						$('#' + this.appDiv.id + 'acreText').hide();
						$('#' + this.appDiv.id + 'parcelAcres').css('border', '1pt solid #ccc');
						this.config.acresDef = "";
						$.each( ($('#' + this.appDiv.id + 'step3').find('.parcelsCB')), lang.hitch(this,function(i,v){	
							$.each(this.layersArray, lang.hitch(this,function(j,w){
								if (w.name == v.value){
									this.config.layerDefs[w.id] = this.config.crsDef + this.config.ownerDef + this.config.acresDef + this.config.descDef + this.config.excludeDef;
								}	
							}));
						}));
						this.dynamicLayer.setLayerDefinitions(this.config.layerDefs);
						this.dynamicLayer1.setLayerDefinitions(this.config.layerDefs);
					}
					if (this.config.selectParcels == "yes"){
						$('#' + this.appDiv.id + 'selectParcels').trigger('click');
					}					
				}));		
				// Toggle summary and parcel section
				$('.viewClick').on('click', lang.hitch(this,function(c){
					$(c.currentTarget).children().toggle();
					$(c.currentTarget).parent().find('.sumText').toggle();
					$(c.currentTarget).parent().find('.parText').toggle();
					$('#' + this.appDiv.id + 'step2, #' + this.appDiv.id + 'step3').slideToggle();
				/*	if (c.currentTarget.innerText == "View Summary"){
						$.each( ($('#' + this.appDiv.id + 'step3').find('.supCB')), lang.hitch(this,function(i,v){		
							if (v.checked == false){
								$('#' + v.id).trigger('click');	
							}
						}));	
					}	*/
				}));
				// Expand collapse info on activities
				$('.expCol').on('click', lang.hitch(this,function(c){
					$(c.currentTarget).children().toggle();
					$(c.currentTarget).parent().find('.infoOpen').slideToggle();
				}));
				// Expand collapse info on layers page
				$('.lyrExpCol').on('click', lang.hitch(this,function(c){
					$(c.currentTarget).children().toggle();
					$(c.currentTarget).parent().find('.infoOpen').slideToggle();
				}));
				// Activities checkboxes
				$('.activitiesCB').on('click', lang.hitch(this,function(c){
					this.config.parcelLayer = c.currentTarget.value;
					this.config.parcelLyrId = c.currentTarget.id;
					this.pcbId = -1;
					$.each(this.layersArray, lang.hitch(this,function(i,v){
						if (v.name == this.config.parcelLayer){
							this.pcbId = v.id;
							return false;
						}	
					}));
					if (c.currentTarget.checked == true){
						this.config.visibleLayers.push(this.pcbId)
						this.config.crsDef = "CRS_NAME='" + this.config.crsSelected + "'";
						this.config.layerDefs[this.pcbId] = this.config.crsDef + this.config.ownerDef + this.config.acresDef  + this.config.descDef + this.config.excludeDef;
						this.buildSmallLegends(this.config.parcelLyrId, this.config.parcelLayer)
						$.each( ($('#' + this.appDiv.id + 'step3').find('.parcelsCB')), lang.hitch(this,function(i,v){
							if (v.checked == true){
								$('#' + this.appDiv.id + 'filterDiv').slideDown();
								return false;
							}	
						}));
						// Show NFOS if Land Use was selected
						if (this.config.parcelLyrId == this.appDiv.id + 'cb-lu' ){
							if (this.config.crsSelected != "Southern Shores NC"){
								$('#' + this.appDiv.id + 'step3').find('.nfos').slideDown();
							}								
						}
						// Show CEOS if Oceanside was selected
						if (this.config.parcelLyrId == this.appDiv.id + 'cb-orsa' ){
							$('#' + this.appDiv.id + 'step3').find('.ceos').slideDown();
						}
					}else{
						var index = this.config.visibleLayers.indexOf(this.pcbId)
						this.config.visibleLayers.splice(index, 1);
						$('#' + this.config.parcelLyrId + '-img0').attr('src','plugins/community-rating-system/images/whiteBox.png');
						this.pchecked = false;
						$.each( ($('#' + this.appDiv.id + 'step3').find('.parcelsCB')), lang.hitch(this,function(i,v){
							if (v.checked == true){
								this.pchecked = true;
							}	
						}));
						// Hide NFOS if Land Use was deselected
						if (this.config.parcelLyrId == this.appDiv.id + 'cb-lu' ){
							$('#' + this.appDiv.id + 'step3').find('.nfos').slideUp();
							if ($('#' + this.appDiv.id + 'cb-nfos').prop('checked') == true){
								$('#' + this.appDiv.id + 'cb-nfos').trigger('click');
							}
							this.hideParcelLabels();
						}
						// Hide CEOS if Oceanside was deselected			
						if (this.config.parcelLyrId == this.appDiv.id + 'cb-orsa' ){
							$('#' + this.appDiv.id + 'step3').find('.ceos').slideUp();
							if ($('#' + this.appDiv.id + 'cb-ceos').prop('checked') == true){
								$('#' + this.appDiv.id + 'cb-ceos').trigger('click');
							}
						}	
						if (this.pchecked == false){
							$('#' + this.appDiv.id + 'filterDiv').slideUp();
						}						
					}
					this.dynamicLayer.setLayerDefinitions(this.config.layerDefs);
					this.dynamicLayer1.setLayerDefinitions(this.config.layerDefs);
					this.dynamicLayer.setVisibleLayers(this.config.visibleLayers);
					this.dynamicLayer1.setVisibleLayers(this.config.visibleLayers1);
				}));
				// Suplemental data checkboxes
				$('.supCB').on('click', lang.hitch(this,function(c){
					this.config.supLayer = c.currentTarget.value;
					this.config.supLyrId = c.currentTarget.id;
					this.scbId = -1;
					$.each(this.layersArray, lang.hitch(this,function(i,v){
						if (v.name == this.config.supLayer){
							this.scbId = v.id;
							return false;
						}	
					}));
					if (c.currentTarget.checked == true){
						this.config.visibleLayers.push(this.scbId)
						this.config.crsDef = "CRS_NAME='" + this.config.crsSelected + "'";
						this.config.layerDefs[this.scbId] = this.config.crsDef;
						this.buildSmallLegends(this.config.supLyrId, this.config.supLayer)
						$(c.currentTarget).parent().parent().find('.longLegDiv').slideDown();
					}else{
						var index = this.config.visibleLayers.indexOf(this.scbId)
						this.config.visibleLayers.splice(index, 1);
						$.each($(c.currentTarget).parent().parent().find('span'),lang.hitch(this,function(i,v){
							$('#' + this.config.supLyrId + '-img' + i).attr('src','plugins/community-rating-system/images/whiteBox.png');	
							$('#' + this.config.supLyrId + '-img' + i + 's').html("");
						}));
						$(c.currentTarget).parent().parent().find('.longLegDiv').slideUp();
					}
					this.dynamicLayer.setLayerDefinitions(this.config.layerDefs);
					this.dynamicLayer1.setLayerDefinitions(this.config.layerDefs);
					this.dynamicLayer.setVisibleLayers(this.config.visibleLayers);
					this.dynamicLayer1.setVisibleLayers(this.config.visibleLayers1);
				}));	
				this.rendered = true;				
			},
			zoomSelectedClass: function(e){
				var c = $('#' + this.appDiv.id + 'printAnchorDiv').children()
				$.each(c,lang.hitch(this,function(i,v){
					$(v).removeClass('zoomSelected');
				}));
				if (e){ $(e).addClass('zoomSelected') }	
			},	
			hideParcelLabels: function (){
				this.config.selectParcels = "no";
				this.parcelsFL.clear();
				$('#' + this.appDiv.id + 'selectParcels').show();
				$('#' + this.appDiv.id + 'hideParcels').hide();
				$(this.printButton).hide();
			},	
			updatePrintTable: function (items){
				$('#' + this.appDiv.id + 'myPrintTable tbody tr').remove()
				this.osp_lu_cac = 0;
				this.osp_lu_cpt = 0;
				this.nfos_cac = 0;
				this.nfos_cpts = 0;
				$.each(items, lang.hitch(this,function(i,v){
					this.printNum = i + 1;
					// Update print table
					var newPrintRow ="<tr>" + 
						"<td>" + this.printNum + "</td>" + 
						"<td>" + v.attributes.PIN + "</td>" +
						"<td>" + v.attributes.DEED_BK_PG + "</td>" +
						"<td>" + Math.round(v.attributes.OSP_LU_cac) + "</td>" +
						"<td>" + Math.round(v.attributes.OSP_LU_cpt) + "</td>" +
						"<td>" + Math.round(v.attributes.NFOS_cac) + "</td>" +
						"<td>" + Math.round(v.attributes.NFOS_cpts) + "</td>" +
						"<td>" + v.attributes.NFOS_DESC + "</td>" +
					"</tr>"
					$('#' + this.appDiv.id + 'myPrintTable tbody').append(newPrintRow)
					// Get totals for select fields
					this.osp_lu_cac = this.osp_lu_cac + v.attributes.OSP_LU_cac;
					this.osp_lu_cpt = this.osp_lu_cpt + v.attributes.OSP_LU_cpt;
					this.nfos_cac = this.nfos_cac + v.attributes.NFOS_cac;
					this.nfos_cpts = this.nfos_cpts + v.attributes.NFOS_cpts;
				}));
				var otherParcelsRow ="<tr>" + 
					"<td class='printCell'></td>" + 
					"<td>All Other Parcels</td>" +
					"<td>  What</td>" +
					"<td>  do</td>" +
					"<td>  we</td>" +
					"<td>  mean</td>" +
					"<td>  by</td>" +
					"<td>  all other parcels?</td>" +
				"</tr>"
				$('#' + this.appDiv.id + 'myPrintTable tbody').append(otherParcelsRow)
				var totalsRow ="<tr>" + 
					"<td class='printCell'></td>" + 
					"<td class='printCell'></td>" +
					"<td><b>TOTALS</b></td>" +
					"<td><b>" + Math.round(this.osp_lu_cac) + "</b></td>" +
					"<td><b>" + Math.round(this.osp_lu_cpt) + "</b></td>" +
					"<td><b>" + Math.round(this.nfos_cac) + "</b></td>" +
					"<td><b>" + Math.round(this.nfos_cpts) + "</b></td>" +
					"<td class='printCell'></td>" +
				"</tr>"
				$('#' + this.appDiv.id + 'myPrintTable tbody').append(totalsRow)
			},	
			excludeFromCrs: function (crsName) {
				// Show all of class parcelRow
				$.each( ($('#' + this.appDiv.id + 'step3').find('.parcelRow')), lang.hitch(this,function(i,v){
					$('#' + v.id).show()		
				}));
				// Hide parcelRow rows based on selected CRS
				if (crsName == "Dare County NC"){
					$('#' + this.appDiv.id + 'devKillHills').hide();
				}	
				if (crsName == "Duck NC"){
					$('#' + this.appDiv.id + 'landUse').hide();		
					$('#' + this.appDiv.id + 'devKillHills').hide();
					$('#' + this.appDiv.id + 'dareOsp').hide();
					$('#' + this.appDiv.id + 'dareTax').hide();
				}
				if (crsName == "Kill Devil Hills NC"){
					$('#' + this.appDiv.id + 'dareOsp').hide();
					$('#' + this.appDiv.id + 'dareTax').hide();
				}
				if (crsName == "Kitty Hawk NC"){
					$('#' + this.appDiv.id + 'devKillHills').hide();
					$('#' + this.appDiv.id + 'dareOsp').hide();
					$('#' + this.appDiv.id + 'dareTax').hide();
				}
				if (crsName == "Manteo NC"){
					$('#' + this.appDiv.id + 'staticVeg').hide();
					$('#' + this.appDiv.id + 'coastalHaz').hide();
					$('#' + this.appDiv.id + 'oceanside').hide();
					$('#' + this.appDiv.id + 'publicBeach').hide();
					$('#' + this.appDiv.id + 'devKillHills').hide();
					$('#' + this.appDiv.id + 'dareOsp').hide();
					$('#' + this.appDiv.id + 'dareTax').hide();
				}
				if (crsName == "Nags Head NC"){
					$('#' + this.appDiv.id + 'devKillHills').hide();
					$('#' + this.appDiv.id + 'dareOsp').hide();
					$('#' + this.appDiv.id + 'dareTax').hide();
				}
				if (crsName == "Southern Shores NC"){
					$('#' + this.appDiv.id + 'devKillHills').hide();
					$('#' + this.appDiv.id + 'dareOsp').hide();
					$('#' + this.appDiv.id + 'dareTax').hide();
				}				
			},	
			buildSmallLegends: function(lyrId, lyrName){
				$('#' + lyrId + '-img').html('');
				$.getJSON( this.config.url +  "/legend?f=pjson&callback=?", lang.hitch(this,function( json ) {
					var legendArray = [];
					//get legend pics
					$.each(json.layers, lang.hitch(this,function(i, v){
						if (v.layerName == lyrName){
							legendArray.push(v)	
						}	
					}));
					// build legend items
					$.each(legendArray[0].legend, lang.hitch(this,function(i, v){
						$('#' + lyrId + '-img' + i).attr("src","data:image/png;base64," + v.imageData );
						$('#' + lyrId + '-img' + i + "s").html(v.label);
					})) 
				})); 	
			},
			clearItems: function(){
				this.config.selectParcels = "no";
				this.parcelsFL.clear();
				this.pinFL.clear();
				this.config.excludeDef = "";
				$('#' + this.appDiv.id + 'selectParcels').show();
				$('#' + this.appDiv.id + 'hideParcels').hide();
				$('#' + this.appDiv.id + 'undoRemove').hide();
				$('#' + this.appDiv.id + 'step2 .gExp, #' + this.appDiv.id + 'step3 .gExp, #' + this.appDiv.id + 'step1 .sumText, #' + this.appDiv.id + 'step1 .parView').show();
				$('#' + this.appDiv.id + 'step2 .gCol, #' + this.appDiv.id + 'step3 .gCol, #' + this.appDiv.id + 'step2 .infoOpen, #' + this.appDiv.id + 'step3 .infoOpen, #' + 
				this.appDiv.id + 'step1 .parText, #' + this.appDiv.id + 'step1 .sumView').hide();
				$.each( ($('#' + this.appDiv.id + 'step3').find('.activitiesCB')), lang.hitch(this,function(i,v){
					if (v.checked == true){
						$('#' + v.id).trigger('click')	
					}	
				}));
				$.each( ($('#' + this.appDiv.id + 'step3').find('.supCB')), lang.hitch(this,function(i,v){		
					if (v.checked == true){
						$('#' + v.id).trigger('click');	
					}
				}));
				$('#' + this.appDiv.id + 'step3').slideUp();
				$("#" + this.appDiv.id + 'ch-OWNER_TYPE').val('').trigger('chosen:updated');
				$("#" + this.appDiv.id + 'ch-OWNER_TYPE').trigger('change');
				$('#' + this.appDiv.id + 'ch-PARCEL_AC').val('').trigger('chosen:updated');
				$('#' + this.appDiv.id + 'ch-PARCEL_AC').trigger('change');
				this.config.crsDef = "";
				//this.map.setExtent(this.crsExtent, true);
				this.map.graphics.clear();
			}
		});
	});	
function commaSeparateNumber(val){
    while (/(\d+)(\d{3})/.test(val.toString())){
		val = val.toString().replace(/(\d+)(\d{3})/, '$1'+','+'$2');
	}
	return val;
}
	
