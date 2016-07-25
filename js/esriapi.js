define([
	"esri/layers/ArcGISDynamicMapServiceLayer", "esri/geometry/Extent", "esri/SpatialReference", "esri/tasks/query", "esri/tasks/QueryTask",
	"esri/symbols/PictureMarkerSymbol", "dijit/TooltipDialog", "dijit/popup",
	"dojo/_base/declare", "framework/PluginBase", "esri/layers/FeatureLayer", "esri/symbols/SimpleLineSymbol", "esri/symbols/SimpleFillSymbol", "esri/lang", "esri/tasks/Geoprocessor",
	"esri/symbols/SimpleMarkerSymbol", "esri/graphic", "dojo/_base/Color", 	"dijit/layout/ContentPane", "dijit/form/HorizontalSlider", "dojo/dom",
	"dojo/dom-class", "dojo/dom-style", "dojo/dom-construct", "dojo/dom-geometry", "dojo/_base/lang", "dojo/on", "dojo/parser", 'plugins/community-rating-system/js/ConstrainedMoveable',
	"jquery", 'plugins/community-rating-system/js/jquery-ui-1.11.2/jquery-ui', "esri/renderers/SimpleRenderer"
],
function ( ArcGISDynamicMapServiceLayer, Extent, SpatialReference, Query, QueryTask, PictureMarkerSymbol, TooltipDialog, dijitPopup,
	declare, PluginBase, FeatureLayer, SimpleLineSymbol, SimpleFillSymbol, esriLang, Geoprocessor, SimpleMarkerSymbol, Graphic, Color,
	ContentPane, HorizontalSlider, dom, domClass, domStyle, domConstruct, domGeom, lang, on, parser, ConstrainedMoveable, $,
	ui, SimpleRenderer) {
        "use strict";

        return declare(null, {
			esriApiFunctions: function(t){
				// Copy of dynamic layer for transparency slider
				t.dynamicLayer1 = new ArcGISDynamicMapServiceLayer(t.config.url, {opacity: 1 - t.config.sliderVal/10});
				t.map.addLayer(t.dynamicLayer1);
				t.dynamicLayer1.on("load", lang.hitch(t, function () {  
					if (t.config.visibleLayers1.length > 0){	
						t.dynamicLayer1.setVisibleLayers(t.config.visibleLayers1);
					}
				}));				
				// Add dynamic map service
				t.dynamicLayer = new ArcGISDynamicMapServiceLayer(t.config.url);
				t.map.addLayer(t.dynamicLayer);
				t.dynamicLayer.on("load", lang.hitch(t, function () {  
					
					if (t.config.visibleLayers.length > 0){	
						t.dynamicLayer.setVisibleLayers(t.config.visibleLayers);
						t.spid = t.config.visibleLayers[0];	
					}
					t.layersArray = t.dynamicLayer.layerInfos;
				}));
				t.dynamicLayer.on("update-end", lang.hitch(t,function(e){
					if (e.target.visibleLayers.length > 0){
						$('#' + t.appDiv.id + 'bottomDiv').show();	
					}else{
						$('#' + t.appDiv.id + 'bottomDiv').hide();	
					}
				}));
				// Create a QueryTask for PIN search
				t.pinQt = new QueryTask(t.config.url + "/6");
				// Create a QueryTask for Future PIN search
				t.fPinQt = new QueryTask(t.config.url + "/16");
				// red selection symbol
				t.selSymbol = new SimpleFillSymbol( SimpleFillSymbol.STYLE_SOLID, new SimpleLineSymbol(
					SimpleLineSymbol.STYLE_SOLID, new Color([255,0,0]), 3 ), new Color([0,0,0,0.1])
				);
				t.selSymbolB = new SimpleFillSymbol( SimpleFillSymbol.STYLE_SOLID, new SimpleLineSymbol(
					SimpleLineSymbol.STYLE_SOLID, new Color([0,0,255]), 2 ), new Color([255,255,255,0])
				);
				t.selSymbolBhl = new SimpleFillSymbol( SimpleFillSymbol.STYLE_SOLID, new SimpleLineSymbol(
					SimpleLineSymbol.STYLE_SOLID, new Color([0,128,255]), 2 ), new Color([0,0,0,0.25])
				);
				// Create a feature layer of parcel selected by PIN
				t.pinFL = new FeatureLayer(t.config.url + "/6", { mode: FeatureLayer.MODE_SELECTION, outFields: ["*"] });
				t.pinFL.setSelectionSymbol(t.selSymbol);
				t.pinFL.on('selection-complete', lang.hitch(t,function(evt){
					if (t.pinTracker == "yes"){
						t.pinTracker = "zcheck"
						var pinExtent = evt.features[0].geometry.getExtent();
						t.map.setExtent(pinExtent, true);
					}
				}));	
				// Create a feature layer of future parcels selected by PIN
				t.fPinFL = new FeatureLayer(t.config.url + "/16", { mode: FeatureLayer.MODE_SELECTION, outFields: ["*"] });
				t.fPinFL.setSelectionSymbol(t.selSymbol);
				t.fPinFL.on('selection-complete', lang.hitch(t,function(evt){
					if (evt.features.length > 0) {
						// May add conditional to track if user is in find by PIN or Query
						if ($('#' + t.appDiv.id + 'toggleQuery').html() == 'Hide Query'){
							$('#' + t.appDiv.id + 'toggleQueryWrap').slideUp();
						$('#' + t.appDiv.id + 'toggleQuery').html('Show Query');
						}
						t.patts = evt.features[0].attributes;
						$('#' + t.appDiv.id + 'parcelInfo .pInfoField').each(lang.hitch(t,function (i,v){
							var field = v.id.split("-").pop()
							var val = t.patts[field];
							if (field == 'DEED_DATE'){
								var date = new Date(val)
								var d = dateFinder(date)
								val = d;
							}else{
								if ( isNaN(t.patts[field]) == false ){
									if (field != 'PIN'){
											
									
										val = Math.round(val);
										val = commaSeparateNumber(val);
										if (field == 'TAX_VALUE'){
											val = '$' + val;	
										}
									}					
								}	
							}	
							$('#' + v.id).html(val)
							$('#' + t.appDiv.id + 'searchPinNone').slideUp();
							$('#' + t.appDiv.id + 'parcelInfo').slideDown();
							t.pinExtent = evt.features[0].geometry.getExtent();
							if (t.config.subSection == 'zoomPar'){
								t.map.setExtent(t.pinExtent, true);
							}	
						}));
						
						
						// Update bar graphs values - get cur and potential points
						t.n = [t.atts.OSP_PTS_2013, t.atts.SUM_ALL_cpts, t.patts.OSP_fpts]
						// find the remaining value so bar numbers can be calculated as percentages
						var m = 2020 - (t.n[0] + t.n[1] + t.n[2])
						t.n.push(m)
						
						// Create empty array and populate it with percentages of current, potential, and remaining
						var p = [];
						$.each(t.n, lang.hitch(t, function(i,v){
							var x = Math.round(v/2020*100);
							p.push(x);
						}));
						$('#' + t.appDiv.id + 'futureGraph').css('display', 'inline-block');
						//$('#' + t.appDiv.id + 'graphLegLblF').show();
						// Update bar values with percentages array
						$('#' + t.appDiv.id + 'barf').animate({left : p[0]+p[1]+"%", width: p[2]+"%"});
						$('#' + t.appDiv.id + 'bar2').animate({left : p[0]+"%", width: p[1]+"%"});
						$('#' + t.appDiv.id + 'bar1').animate({left : "0%", width: p[0]+"%"});
						// Add labels to current and potential bars (round decimals and add commas as necessary)
						if (isNaN(t.atts.OSP_PTS_2013) == false){
							var curPnts = Math.round(t.atts.OSP_PTS_2013);
							curPnts = commaSeparateNumber(curPnts);
							$('#' + t.appDiv.id + 'bar1L').html(curPnts)
						}	
						if (isNaN(t.atts.SUM_ALL_cpts) == false){
							var potPnts = Math.round(t.atts.SUM_ALL_cpts);
							potPnts = commaSeparateNumber(potPnts);
							$('#' + t.appDiv.id + 'bar2L').html(potPnts);
						}
						if (isNaN(t.patts.OSP_fpts) == false){
							var futPnts = Math.round(t.patts.OSP_fpts);
							futPnts = commaSeparateNumber(futPnts);
							$('#' + t.appDiv.id + 'barfL').html(futPnts);
						}
						
					}else{
						$('#' + t.appDiv.id + 'parcelInfo').slideUp();
						$('#' + t.appDiv.id + 'searchPinNone').slideDown();	
					}	
					$('.accrodBg').removeClass('waiting');
				}));
				$('#' + t.appDiv.id + 'futureZoom').on('click',lang.hitch(t,function(){
					t.map.setExtent(t.pinExtent, true);
				}));
				// Create a feature layer of future parcels selected by PIN
				t.fManyPinFL = new FeatureLayer(t.config.url + "/16", { mode: FeatureLayer.MODE_SELECTION, outFields: ["*"] });
				t.fManyPinFL.setSelectionSymbol(t.selSymbolB);
				t.fManyPinFL.on('mouse-over',lang.hitch(t,function(evt){
					t.map.setMapCursor("pointer");
					var highlightGraphic = new Graphic(evt.graphic.geometry,t.selSymbolBhl);
					t.map.graphics.add(highlightGraphic);
					t.obid = evt.graphic.attributes.OBJECTID
				}))
				t.map.graphics.on("mouse-out", lang.hitch(t,function(){
					t.map.setMapCursor("default");
					t.map.graphics.clear();
					t.obid = -1
				}));
				t.map.on("click", lang.hitch(t, function(event) {
					if ( t.obid > -1 ){ 
						var p = "r"
						$('#' + t.appDiv.id + 'ch-FUT').val(String(t.obid)).trigger('chosen:updated').trigger('change', p)
					}	
				}));
				t.fManyPinFL.on('selection-complete', lang.hitch(t,function(evt){
					if (evt.features.length > 100) {
						t.fManyPinFL.clear();
						$('#' + t.appDiv.id + 'queryParMany').slideDown();
						$('#' + t.appDiv.id + 'queryParNone').slideUp();
						$('#' + t.appDiv.id + 'fParSelWrapper').slideUp();
					}else{
						if (evt.features.length > 0) {
							t.config.totalFuturePoints = 0;
							t.futDDoptions = [];
							$.each(evt.features, lang.hitch(t, function(i,v){
								t.config.totalFuturePoints = t.config.totalFuturePoints + v.attributes.OSP_fpts;
								t.futDDoptions.push({acres: v.attributes.OSP_fac, tax: v.attributes.TAX_VALUE, obid: v.attributes.OBJECTID})
							}));
							// Update dropdown list of parcels by acres and tax value
							t.esriapi.futureDropdown(t);
							
							// Update bar graphs values - get cur and potential points
							t.n = [t.atts.OSP_PTS_2013, t.atts.SUM_ALL_cpts, t.config.totalFuturePoints]
							// find the remaining value so bar numbers can be calculated as percentages
							var m = 2020 - (t.n[0] + t.n[1] + t.n[2])
							t.n.push(m)
							
							// Create empty array and populate it with percentages of current, potential, and remaining
							var p = [];
							$.each(t.n, lang.hitch(t, function(i,v){
								var x = Math.round(v/2020*100);
								p.push(x);
							}));
							$('#' + t.appDiv.id + 'futureGraph').css('display', 'inline-block');
							//$('#' + t.appDiv.id + 'graphLegLblF').show();
							// Update bar values with percentages array
							$('#' + t.appDiv.id + 'barf').animate({left : p[0]+p[1]+"%", width: p[2]+"%"});
							$('#' + t.appDiv.id + 'bar2').animate({left : p[0]+"%", width: p[1]+"%"});
							$('#' + t.appDiv.id + 'bar1').animate({left : "0%", width: p[0]+"%"});
							// Add labels to current and potential bars (round decimals and add commas as necessary)
							if (isNaN(t.atts.OSP_PTS_2013) == false){
								var curPnts = Math.round(t.atts.OSP_PTS_2013);
								curPnts = commaSeparateNumber(curPnts);
								$('#' + t.appDiv.id + 'bar1L').html(curPnts)
							}	
							if (isNaN(t.atts.SUM_ALL_cpts) == false){
								var potPnts = Math.round(t.atts.SUM_ALL_cpts);
								potPnts = commaSeparateNumber(potPnts);
								$('#' + t.appDiv.id + 'bar2L').html(potPnts);
							}
							if (isNaN(t.config.totalFuturePoints) == false){
								var futPnts = Math.round(t.config.totalFuturePoints);
								futPnts = commaSeparateNumber(futPnts);
								$('#' + t.appDiv.id + 'barfL').html(futPnts);
								$('#' + t.appDiv.id + 'futurePointsSum').html(futPnts)
							}
							
							$('#' + t.appDiv.id + 'futureParcelCount').html(evt.features.length)
							$('#' + t.appDiv.id + 'queryParNone, #' + t.appDiv.id + 'queryParMany').slideUp();
							$('#' + t.appDiv.id + 'toggleQuery').html('Hide Query');
							$('#' + t.appDiv.id + 'fParSelWrapper').slideDown();
						}else{
							t.fManyPinFL.clear();
							$('#' + t.appDiv.id + 'fParSelWrapper').slideUp();
							$('#' + t.appDiv.id + 'queryParMany').slideUp();
							$('#' + t.appDiv.id + 'queryParNone').slideDown();
						}	
					}
					$('.accrodBg').removeClass('waiting');					
				}));
				$('#' + t.appDiv.id + 'toggleQuery').on('click', lang.hitch(t,function(evt){
					if ($('#' + t.appDiv.id + 'toggleQuery').html() == 'Show Query'){
						$('#' + t.appDiv.id + 'toggleQueryWrap').slideDown();
						$('#' + t.appDiv.id + 'toggleQuery').html('Hide Query');
					}else{
						$('#' + t.appDiv.id + 'toggleQueryWrap').slideUp();
						$('#' + t.appDiv.id + 'toggleQuery').html('Show Query');
					}
				}));	
				// Track extent changes for pin zooms
				t.pinTracker = "no"			
				// Create a feature layer of the selected layer and add mouseover, mouseout, and click listeners
				t.crsFL = new FeatureLayer(t.config.url + "/0", { mode: FeatureLayer.MODE_SELECTION, outFields: ["*"] });
				//t.crsFL.setSelectionSymbol(selSymbol);
				t.crsFL.on('selection-complete', lang.hitch(t,function(evt){
					// Get and zoom to extent of selected feature
					var crsExtent = evt.features[0].geometry.getExtent();				
					if ( t.config.stateSet == "yes" ){	
						var extent = new Extent(t.config.extent.xmin, t.config.extent.ymin, t.config.extent.xmax, t.config.extent.ymax, new SpatialReference({ wkid:4326 }))
						t.map.setExtent(extent, true);
						t.config.extent = "";
					}else{
						t.map.setExtent(crsExtent, true); 
					}
					// Get attributes of selected feature
					t.atts = evt.features[0].attributes;
					// User clicked download section on home page
					if (t.config.section == "ospAppBtn" || t.config.section == "futureOSPBtn"){
						// Loop through all elements with class s2Atts in the step1 div and use their IDs to show selected features attributes
						$('#' + t.appDiv.id + 'step2 .s2Atts').each(lang.hitch(t,function (i,v){
							var field = v.id.split("-").pop()
							var val = t.atts[field]
							if ( isNaN(t.atts[field]) == false ){
								val = Math.round(val);
								val = commaSeparateNumber(val);
							}	
							$('#' + v.id).html(val)
						}));
						// Update bar graphs values - get cur and potential points
						t.n = [t.atts.OSP_PTS_2013, t.atts.SUM_ALL_cpts]
						// find the remaining value so bar numbers can be calculated as percentages
						var m = 2020 - (t.n[0] + t.n[1])
						t.n.push(m)
						// Create empty array and populate it with percentages of current, potential, and remaining
						var p = [];
						$.each(t.n, lang.hitch(t, function(i,v){
							var x = Math.round(v/2020*100);
							p.push(x);
						}));
						// Update bar values with percentages array
						$('#' + t.appDiv.id + 'barf').animate({left : "0%", width: "0%"});
						$('#' + t.appDiv.id + 'bar2').animate({left : p[0]+"%", width: p[1]+"%"});
						$('#' + t.appDiv.id + 'bar1').animate({left : "0%", width: p[0]+"%"});
						// Add labels to current and potential bars (round decimals and add commas as necessary)
						if (isNaN(t.atts.OSP_PTS_2013) == false){
							var curPnts = Math.round(t.atts.OSP_PTS_2013);
							curPnts = commaSeparateNumber(curPnts);
							$('#' + t.appDiv.id + 'bar1L').html(curPnts)
						}	
						if (isNaN(t.atts.SUM_ALL_cpts) == false){
							var potPnts = Math.round(t.atts.SUM_ALL_cpts);
							potPnts = commaSeparateNumber(potPnts);
							$('#' + t.appDiv.id + 'bar2L').html(potPnts);
						}
					}	
				}));	
				//t.map.addLayer(t.crsFL);
				t.map.addLayer(t.pinFL);
				t.map.addLayer(t.fManyPinFL);
				t.map.addLayer(t.fPinFL);
				//t.resize();
				
				// Create and handle transparency slider
				$('#' + t.appDiv.id + 'slider').slider({ min: 0,	max: 10, value: t.config.sliderVal });
				$('#' + t.appDiv.id + 'slider').on( "slidechange", lang.hitch(t,function( e, ui ) {
					t.config.sliderVal = ui.value;
					t.dynamicLayer1.setOpacity(1 - ui.value/10);
				}));	
			},
			futureDropdown: function(t){
				// Create sorted objects by tax and acreage for teh returned parcels
				t.aSm = _.sortBy( t.futDDoptions, 'acres' );
				t.aLr = _.sortBy( t.futDDoptions, 'acres' ).reverse();
				t.tSm = _.sortBy( t.futDDoptions, 'tax' );
				t.tLr = _.sortBy( t.futDDoptions, 'tax' ).reverse();
				// Add conditional statements to determine which array to add to select menu	
				var resultArray = [];
				if (t.config.futSortOn == 'acres' && t.config.futSortOrder == "acen"){
					resultArray = t.aSm;
				}
				if (t.config.futSortOn == 'acres' && t.config.futSortOrder == "decen"){
					resultArray = t.aLr;
				}				
				if (t.config.futSortOn == 'taxval' && t.config.futSortOrder == "acen"){
					resultArray = t.tSm;
				}
				if (t.config.futSortOn == 'taxval' && t.config.futSortOrder == "decen"){
					resultArray = t.tLr;
				}
				$('#' + t.appDiv.id + 'ch-FUT').empty();
				$('#' + t.appDiv.id + 'ch-FUT').append("<option value=''></option>");
				$.each(resultArray, lang.hitch(t,function(i,v){
					var acres = Math.round(v.acres);
					acres = commaSeparateNumber(acres);
					var tax = commaSeparateNumber(v.tax);
					$('#' + t.appDiv.id + 'ch-FUT').append("<option value='" + v.obid + "'>" + acres + " acres | $" + tax + "</option>");
				}));
				$('#' + t.appDiv.id + 'ch-FUT').trigger("chosen:updated");
			}			
        });
    }
);