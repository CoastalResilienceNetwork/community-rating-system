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
			navListeners: function(t){
				// Download data for all eligible OSP areas for my CRS application click
				$('#' + t.appDiv.id + 'ospAppBtn').on('click',lang.hitch(t,function(){
					t.config.section = "dl";
					$('#' + t.appDiv.id + 'topHeader').html($('#' + t.appDiv.id + 'ospAppBtn').html());
					$('#' + t.appDiv.id + 'home').slideUp();
					$('#' + t.appDiv.id + 'topWrapper, #' + t.appDiv.id + 'dlOspWrapper').slideDown();
					$(t.con).animate({ height: '578px', width: '425px' }, 250,
						lang.hitch(t,function(){
							t.resize();
						})
					);
				}));
				// Find and Print a Parcel by PIN click
				$('#' + t.appDiv.id + 'parcelByIdBtn').on('click',lang.hitch(t,function(){
					t.config.section = "pin";
					$('#' + t.appDiv.id + 'topHeader').html($('#' + t.appDiv.id + 'parcelByIdBtn').html());
					$('#' + t.appDiv.id + 'home').slideUp();
					$('#' + t.appDiv.id + 'topWrapper, #' + t.appDiv.id + 'dlOspWrapper').slideDown();
					$(t.con).animate({ height: '540px', width: '425px' }, 250,
						lang.hitch(t,function(){
							t.resize();
						})
					);
				}));	
				// Future OSP Button click
				$('#' + t.appDiv.id + 'futureOSPBtn').on('click',lang.hitch(t,function(){
					t.config.section = "fut";
					$('#' + t.appDiv.id + 'topHeader').html($('#' + t.appDiv.id + 'futureOSPBtn').html());
					$('#' + t.appDiv.id + 'home').slideUp();
					$('#' + t.appDiv.id + 'topWrapper, #' + t.appDiv.id + 'dlOspWrapper').slideDown();
					$(t.con).animate({ height: '660px', width: '415px' }, 250,
						lang.hitch(t,function(){
							t.resize();
						})
					);
				}));	
				// Home button click
				$('#' + t.appDiv.id + 'homeBtn').on('click',lang.hitch(t,function(){
					t.map.setExtent(t.dynamicLayer.initialExtent, true);
					t.config.dlOspLayers = [0,9];
					t.config.transLayer = [10];
					t.config.visibleLayers = [];
					t.config.visibleLayers1 = [];
					t.dynamicLayer.setVisibleLayers(t.config.visibleLayers);
					t.dynamicLayer1.setVisibleLayers(t.config.visibleLayers1);			
					$('#' + t.appDiv.id + 'ch-CRS').val('').trigger('chosen:updated');
					$('#' + t.appDiv.id + 'ch-CRS').trigger('change');
					$('#'  + t.appDiv.id + 'topWrapper, #' + t.appDiv.id + 'dlOspWrapper, #' + t.appDiv.id + 'step2, #' + t.appDiv.id + 'printWrapper').slideUp();
					t.fPinFL.clear();
					this.navigation.clearFuture(t);
					$('#' + t.appDiv.id + 'home').slideDown();
					$(t.con).animate({ height: '216px', width: '425px' }, 250);
				}));
				$('#' + t.appDiv.id + 'zoomParNavBtn').on('click',lang.hitch(t,function(){
					t.config.subSection = 'zoomPar';
					$('#' + t.appDiv.id + 'queryParNavBtn').removeClass('navBtnSel');
					$('#' + t.appDiv.id + 'zoomParNavBtn').addClass('navBtnSel');
					t.fPinFL.clear();
					t.fManyPinFL.clear();
					$('#' + t.appDiv.id + 'parcelInfo, #' + t.appDiv.id + 'fParSelWrapper').slideUp();
					$('#' + t.appDiv.id + 'qpWrapper').slideUp( 250,lang.hitch(t,function() {
						$('#' + t.appDiv.id + 'ztpWrapper').slideDown(250);
					}));
				}));	
				$('#' + t.appDiv.id + 'queryParNavBtn').on('click',lang.hitch(t,function(){
					t.config.subSection = 'queryPar';
					$('#' + t.appDiv.id + 'zoomParNavBtn').removeClass('navBtnSel');
					$('#' + t.appDiv.id + 'queryParNavBtn').addClass('navBtnSel');
					t.fPinFL.clear();
					$('#' + t.appDiv.id + 'ztpWrapper, #' + t.appDiv.id + 'parcelInfo, #' + t.appDiv.id + 'searchPinNone').slideUp( 250,lang.hitch(t,function() {
						$('#' + t.appDiv.id + 'qpWrapper').slideDown(250);
						if ($('#' + t.appDiv.id + 'toggleQuery').html() == 'Show Query'){
							$('#' + t.appDiv.id + 'toggleQueryWrap').slideDown();
							$('#' + t.appDiv.id + 'toggleQuery').html('Hide Query');
						}
					}));
					
				}));
			},
			clearFuture: function(t){
				t.fPinFL.clear();
				t.fManyPinFL.clear();
				$('#' + t.appDiv.id + 'ch-FUT').val('').trigger('chosen:updated');
				$('#' + t.appDiv.id + 'ch-FUT').trigger('change');
				$('#' + t.appDiv.id + 'futureGraph').css('display', 'none');
				$('#' + t.appDiv.id + 'pinSearch').val('');
				$('#' + t.appDiv.id + 'parcelInfo, #' + t.appDiv.id + 'fParSelWrapper, #' + t.appDiv.id + 'searchPinNone').slideUp();
				if (t.config.subSection == 'zoomPar'){
					console.log('zoom')
					$('#' + t.appDiv.id + 'qpWrapper').slideUp(); 
					$('#' + t.appDiv.id + 'zptWrapper').slideDown(); 	
				}
				if (t.config.subSection == 'queryPar'){
					console.log('query')
					$('#' + t.appDiv.id + 'zptWrapper').slideUp(); 
					$('#' + t.appDiv.id + 'qpWrapper').slideDown(); 
					$('#' + t.appDiv.id + 'toggleQueryWrap').slideDown();
				}
				$('#' + t.appDiv.id + 'futureWrapper').slideUp();				
			}	
        });
    }
);