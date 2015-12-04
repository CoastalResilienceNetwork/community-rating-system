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
					domStyle.set(this.con1, "width", "380px");
					domStyle.set(this.con1, "height", "540px");
				}else{
					domStyle.set(this.con, "width", "380px");
					domStyle.set(this.con, "height", "540px");
				}	
				// Define object to access global variables from JSON object. Only add variables to config.JSON that are needed by Save and Share. 
				this.config = dojo.eval("[" + config + "]")[0];	
				// Define global config not needed by Save and Share
				this.url = "http://dev.services2.coastalresilience.org:6080/arcgis/rest/services/North_Carolina/NC_CRS/MapServer"
			},
			// Called after initialize at plugin startup (why all the tests for undefined). Also called after deactivate when user closes app by clicking X. 
			hibernate: function () {
				$('.legend').removeClass("hideLegend");
				if (this.appDiv != undefined){
					$('#' + this.appDiv.id + 'ch-CRS').val('').trigger('chosen:updated');
					$('#' + this.appDiv.id + 'ch-CRS').trigger('change');
				}
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
				}
			},
			// Called when user hits the minimize '_' icon on the pluging. Also called before hibernate when users closes app by clicking 'X'.
			deactivate: function () {
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
				this.appDiv = new ContentPane({style:'padding:8px 8px 8px 8px'});
				parser.parse();
				dom.byId(this.container).appendChild(this.appDiv.domNode);					
				// Get html from content.html, prepend appDiv.id to html element id's, and add to appDiv
				var idUpdate = content.replace(/id='/g, "id='" + this.appDiv.id);	
				$('#' + this.appDiv.id).html(idUpdate);
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
				this.dynamicLayer.on("update-end", lang.hitch(this,function(e){
					if (e.target.visibleLayers.length > 0){
						$('#' + this.appDiv.id + 'bottomDiv').show();	
					}else{
						$('#' + this.appDiv.id + 'bottomDiv').hide();	
					}
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
					var config = { '.chosen-select'           : {allow_single_deselect:true, width:"130px", disable_search:true}}
					var config1 = { '.chosen-select1'           : {allow_single_deselect:true, width:"130px", disable_search:true}}
					var config2 = { '.chosen-select2'           : {allow_single_deselect:true, width:"130px", disable_search:true}}
					for (var selector in config) { $(selector).chosen(config[selector]); }
					for (var selector in config1) { $(selector).chosen(config1[selector]); }
					for (var selector in config2) { $(selector).chosen(config2[selector]); }
				}));	
				// Use selections on chosen menus 
				require(["jquery", "plugins/community-rating-system/js/chosen.jquery"],lang.hitch(this,function($) {			
					//Select CRS 
					$('#' + this.appDiv.id + 'ch-CRS').chosen().change(lang.hitch(this,function(c, p){
						console.log('made it')
						// something was selected
						if (p) {
							// Loop through dynamic map service infos and check if and see which layer matches the selected value
							$.each(this.layersArray, lang.hitch(this,function(i,v){
								this.config.taxDistrictLayer = c.currentTarget.value;
								if (v.name == this.config.taxDistrictLayer){
									// create feature layer of selected layer and add it to map
									this.crsSelected(v.id);
									// build a legend for selected layer
									this.buildLegend();
									return false	
								}	
							}))
							$('#' + this.appDiv.id + 'step0, #' + this.appDiv.id + 'step1').slideDown();
						}
						// selection was cleared
						else{	
							this.clearItems();
							$('#' + this.appDiv.id + 'step0, #' + this.appDiv.id + 'step1, #' + this.appDiv.id + 'step1a, #' + this.appDiv.id + 'step2, #' + this.appDiv.id + 'step3').slideUp();
							this.map.removeLayer(this.taxDistFL)
							
						}
					}));
					// Select Owner Type
					$('#' + this.appDiv.id + 'ch-OWNER_TYPE').chosen().change(lang.hitch(this,function(c, p){
						if (p) {
							this.config.ownerDef = " AND OWNER_TYPE='" + c.currentTarget.value + "'";
							$.each( ($('#' + this.appDiv.id + 'step3').find('.parcelsCB')), lang.hitch(this,function(i,v){		
								$.each(this.layersArray, lang.hitch(this,function(j,w){
									if (w.name == v.value){
										this.config.layerDefs[w.id] = this.config.taxDistDef + this.config.ownerDef;
									}	
								}));
							}));
							this.dynamicLayer.setLayerDefinitions(this.config.layerDefs);
						}else{
							this.config.ownerDef = "";
							$.each( ($('#' + this.appDiv.id + 'step3').find('.parcelsCB')), lang.hitch(this,function(i,v){	
								$.each(this.layersArray, lang.hitch(this,function(j,w){
									if (w.name == v.value){
										this.config.layerDefs[w.id] = this.config.taxDistDef + this.config.ownerDef;
									}	
								}));
							}));
							this.dynamicLayer.setLayerDefinitions(this.config.layerDefs);
						}	
					}));
					// Select greater than or less than	acres	
					$('#' + this.appDiv.id + 'ch-PARCEL_AC').chosen().change(lang.hitch(this,function(c, p){
						if (p){
							this.gTlT = c.currentTarget.value;
							$('#' + this.appDiv.id + 'parcelAcresDiv').show();
						}else{
							$('#' + this.appDiv.id + 'parcelAcres').val('');
							this.config.acresDef = "";
							$('#' + this.appDiv.id + 'parcelAcresDiv').hide();
						}					
					}));	
				}));
				// Parcel acres input change listener
				$('#' + this.appDiv.id + 'parcelAcres').on('keyup', lang.hitch(this,function(c){
					console.log(c.currentTarget.value)
				}));		
				// Clear a selected Tax District
				$('#' + this.appDiv.id + 'clearTD').on('click', lang.hitch(this,function( i, c ) {
					this.clearItems();
					$('#' + this.appDiv.id + 'step1a, #' + this.appDiv.id + 'step2, #' + this.appDiv.id + 'step3').slideUp();
					$('#' + this.appDiv.id + 'step1').slideDown();
					this.taxDistFL.show();
				}));
				// Toggle summary and parcel section
				$('.viewClick').on('click', lang.hitch(this,function(c){
					$(c.currentTarget).children().toggle();
					$(c.currentTarget).parent().find('.sumText').toggle();
					$(c.currentTarget).parent().find('.parText').toggle();
					$('#' + this.appDiv.id + 'step2, #' + this.appDiv.id + 'step3').slideToggle();
					if (c.currentTarget.innerText == "View Summary"){
						$.each( ($('#' + this.appDiv.id + 'step3').find('.supCB')), lang.hitch(this,function(i,v){		
							if (v.checked == false){
								$('#' + v.id).trigger('click');	
							}
						}));	
					}	
				}));
				// Expand collapse info on activities
				$('.expCol').on('click', lang.hitch(this,function(c){
					$(c.currentTarget).children().toggle();
					$(c.currentTarget).parent().find('.infoOpen').slideToggle();
				}));
				// View Parcels checkboxes
				$('.parcelsCB').on('click', lang.hitch(this,function(c){
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
						this.config.taxDistDef = "TAX_DIST='" + this.config.taxDist + "'";
						this.config.layerDefs[this.pcbId] = this.config.taxDistDef + this.config.ownerDef;
						this.buildSmallLegends(this.config.parcelLyrId, this.config.parcelLayer)
						$('#' + this.appDiv.id + 'filterDiv').slideDown();
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
						if (this.pchecked == false){
							$('#' + this.appDiv.id + 'filterDiv').slideUp();
						}	
					}
					this.dynamicLayer.setLayerDefinitions(this.config.layerDefs);
					this.dynamicLayer.setVisibleLayers(this.config.visibleLayers);
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
						this.buildSmallLegends(this.config.supLyrId, this.config.supLayer)
					}else{
						var index = this.config.visibleLayers.indexOf(this.scbId)
						this.config.visibleLayers.splice(index, 1);
						$.each($(c.currentTarget).parent().parent().find('span'),lang.hitch(this,function(i,v){
							$('#' + this.config.supLyrId + '-img' + i).attr('src','plugins/community-rating-system/images/whiteBox.png');	
							$('#' + this.config.supLyrId + '-img' + i + 's').html("");
						}));
					}
					this.dynamicLayer.setVisibleLayers(this.config.visibleLayers);
				}));	
				this.rendered = true;				
			},
			// CRS Selected
			crsSelected: function(lid){
				// Create a feature layer of the selected layer and add mouseover, mouseout, and click listeners
				this.taxDistFL = new FeatureLayer(this.url + "/" + lid, { mode: FeatureLayer.MODE_SNAPSHOT, outFields: ["*"] });
				this.map.addLayer(this.taxDistFL);
				this.map.on('layer-add-result', lang.hitch(this,function(){
					this.crsExtent = new esri.geometry.Extent(this.taxDistFL.fullExtent.xmin, this.taxDistFL.fullExtent.ymin, this.taxDistFL.fullExtent.xmax, this.taxDistFL.fullExtent.ymax, new esri.SpatialReference({ wkid:102100 }));
					this.map.setExtent(this.crsExtent, true);
				}));
				dojo.connect(this.taxDistFL, "onMouseOver", lang.hitch(this,function(e){this.map.setMapCursor("pointer")}));
				dojo.connect(this.taxDistFL, "onMouseOut", lang.hitch(this,function(e){this.map.setMapCursor("default")}));		
				this.taxDistFL.on('click', lang.hitch(this,function(c){
					// get selected graphics attributes
					this.atts = c.graphic.attributes;
					// get selected tax district for definition query
					this.config.taxDist = this.atts.TAX_DIST;
					// zoom to selected graphic's exent and remove the feature layer
					var extent = new esri.geometry.Extent(c.graphic._extent.xmin, c.graphic._extent.ymin, c.graphic._extent.xmax, c.graphic._extent.ymax, new esri.SpatialReference({ wkid:102100 }));
					this.map.setExtent(extent, true);
					this.taxDistFL.hide();
					var hlsymbol = new SimpleFillSymbol( SimpleFillSymbol.STYLE_SOLID, new SimpleLineSymbol(
						SimpleLineSymbol.STYLE_SOLID, new Color([255,0,0]), 2 ), new Color([125,125,125,0])
					);
					// add the selected graphic to the map seperate from it's source feature layer
					this.map.graphics.add(new Graphic(c.graphic.geometry, hlsymbol))
					this.map.setMapCursor("default")
					// update visiblity of app elements
					$('#' + this.appDiv.id + 'step1').slideUp();
					$('#' + this.appDiv.id + 'step1a, #' + this.appDiv.id + 'step2').slideDown();
					// place attributes in elements
					$('#' + this.appDiv.id + 'step1a .s2Atts').each(lang.hitch(this,function (i,v){
						var field = v.id.split("-").pop()
						var val = this.atts[field]	
						$('#' + v.id).html(val)
					}));	
					$('#' + this.appDiv.id + 'step2 .s2Atts').each(lang.hitch(this,function (i,v){
						var field = v.id.split("-").pop()
						var val = this.atts[field]
						if ( isNaN(this.atts[field]) == false ){
							val = Math.round(val);
							val = commaSeparateNumber(val);
						}	
						$('#' + v.id).html(val)
					}));	
				}));
			},	
			// Build legend from JSON request
			buildLegend: function(){
				// Refresh Legend div content 
				$('#' + this.appDiv.id + 'mySpeciesLegend').html('');
				$.getJSON( this.url +  "/legend?f=pjson&callback=?", lang.hitch(this,function( json ) {
					var legendArray = [];
					//get legend pics
					$.each(json.layers, lang.hitch(this,function(i, v){
						if (v.layerName == this.config.taxDistrictLayer){
							legendArray.push(v)	
						}	
					}));
					// Set Title
					$('#' + this.appDiv.id + 'mySpeciesLegend').append("<div style='display:inline;text-decoration:underline;margin-top:0px;'>" + this.config.taxDistrictLayer + "</div><br>")
					// build legend items
					$.each(legendArray[0].legend, lang.hitch(this,function(i, v){
						$('#' + this.appDiv.id + 'mySpeciesLegend').append("<p style='display:inline;'>" + v.label + "</p><img style='margin-bottom:-5px; margin-left:5px;' src='data:image/png;base64," + v.imageData + "' alt='Legend color'><br>")		
					})) 
				})); 	
			},	
			buildSmallLegends: function(lyrId, lyrName){
				$('#' + lyrId + '-img').html('');
				$.getJSON( this.url +  "/legend?f=pjson&callback=?", lang.hitch(this,function( json ) {
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
				$('#' + this.appDiv.id + 'step2 .gExp, #' + this.appDiv.id + 'step1a .sumText, #' + this.appDiv.id + 'step1a .parView').show();
				$('#' + this.appDiv.id + 'step2 .gCol, #' + this.appDiv.id + 'step2 .infoOpen, #' + this.appDiv.id + 'step1a .parText, #' + this.appDiv.id + 'step1a .sumView').hide();
				$.each( ($('#' + this.appDiv.id + 'step3').find('.parcelsCB')), lang.hitch(this,function(i,v){
					if (v.checked == true){
						$('#' + v.id).trigger('click')	
					}	
				}));
				$.each( ($('#' + this.appDiv.id + 'step3').find('.supCB')), lang.hitch(this,function(i,v){		
					if (v.checked == true){
						$('#' + v.id).trigger('click');	
					}
				}));
				$("#" + this.appDiv.id + 'ch-OWNER_TYPE').val('').trigger('chosen:updated');
				$("#" + this.appDiv.id + 'ch-OWNER_TYPE').trigger('change');
				$('#' + this.appDiv.id + 'ch-PARCEL_AC').val('').trigger('chosen:updated');
				$('#' + this.appDiv.id + 'ch-PARCEL_AC').trigger('change');
				this.config.taxDistDef = "";
				this.map.setExtent(this.crsExtent, true);
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
	