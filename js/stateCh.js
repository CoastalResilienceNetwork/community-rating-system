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
			checkState: function(t){
				$(document).ready(lang.hitch(t,function(){
				// was setState called at startup?
				if ( t.config.stateSet == "yes" ){
					// what section was the user in?
					if ( t.config.section != 'homeBtn' ){
						$('#' + t.appDiv.id + t.config.section).trigger('click');
						// was a community selected?
						if ( t.config.crsSelected != "" ){
							require(["jquery", "plugins/community-rating-system/js/chosen.jquery"],lang.hitch(t,function($) {
								var p = "r"
								$('#' + t.appDiv.id + 'ch-CRS').val(t.config.crsSelected).trigger('chosen:updated').trigger('change', p)	
							}));
							// Download data for OSP section 
							if (t.config.section == "ospAppBtn"){
								// open accordians to match user selections
								$('#' + t.appDiv.id + 'dlAccord').accordion( "option", "active", t.config.activeAcIndex )	
								$('#' + t.appDiv.id + 'dlAccord1').accordion( "option", "active", t.config.activeAc1Index )	
								// Open OPS element summaries
								$.each(t.config.ospElementsVis, lang.hitch(t,function(i, v){
									$('#' + t.appDiv.id + 'elementsWrapper .firstIndent').each(lang.hitch(t,function(j, w){
										if (v == j){
											$(w).find('.infoOpen').show();
											$(w).find('.expCol').children().toggle();							
										}			
									}));
								}));
							}	
							// Find and print parcel by PIN seciton
						/*	if (t.config.section == "parcelByIdBtn"){
								$.each(t.pinSelArray, lang.hitch(t,function(i,v){
									require(["jquery", "plugins/community-rating-system/js/chosen.jquery"],lang.hitch(t,function($) {
										var p = "r"
										$('#' + t.appDiv.id + 'ch-PIN').val(v).trigger('chosen:updated').trigger('change', p)
									}));
								}));
							}*/
						} 	
					}		
				}
				}));	
			}	
        });
    }
);