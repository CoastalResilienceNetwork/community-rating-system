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
			chosenListeners: function(t){
				// Enable jquery plugin 'chosen'
				require(["jquery", "plugins/community-rating-system/js/chosen.jquery"],lang.hitch(this,function($) {
					var configCrs =  { '.chosen-crs' : {allow_single_deselect:true, width:"200px", disable_search:true}}
					var configPin =  { '.chosen-pin' : {allow_single_deselect:true, width:"200px", search_contains:true}}
					var configfPin =  { '.chosen-fpin' : {allow_single_deselect:true, width:"250px", search_contains:true}}
					for (var selector in configCrs)  { $(selector).chosen(configCrs[selector]); }
					for (var selector in configPin)  { $(selector).chosen(configPin[selector]); }
					for (var selector in configfPin)  { $(selector).chosen(configfPin[selector]); }
				}));
				// User selections on chosen menus 
				require(["jquery", "plugins/community-rating-system/js/chosen.jquery"],lang.hitch(t,function($) {			
					//Select CRS 
					$('#' + t.appDiv.id + 'ch-CRS').chosen().change(lang.hitch(t,function(c, p){
						//Clear Items
						t.pinFL.clear();
						$('#' + t.appDiv.id + 'step2 .gExp').show();
						$('#' + t.appDiv.id + 'step2 .gCol, #' + t.appDiv.id + 'step2 .infoOpen').hide();
						t.map.graphics.clear();
						// something was selected
						if (p) {
							t.config.crsSelected = c.currentTarget.value;
							t.config.crsNoSpace = c.currentTarget.value.replace(/\s+/g, '');
							// use selected community to query community layer 	
							var q = new Query();
							q.where = "CRS_NAME = '" + t.config.crsSelected + "'";
							t.crsFL.selectFeatures(q,FeatureLayer.SELECTION_NEW);
							$('#' + t.appDiv.id + 'printAnchorDiv').empty();
							// User clicked download section on home page
							if (t.config.section == "dl"){
								t.config.crsSelUnderscore = t.config.crsSelected.replace(/ /g,"_");
								$('#' + t.appDiv.id + 'allParLink').show();
								$('#' + t.appDiv.id + 'larParLink').show();
								$('#' + t.appDiv.id + 'ceosLink').show();
								$('#' + t.appDiv.id + 'sbLink').show();
								$('#' + t.appDiv.id + 'csvDesc').show();
								if (t.config.crsSelected == "Duck NC1"){
									$('#' + t.appDiv.id + 'allParLink').hide();
									$('#' + t.appDiv.id + 'larParLink').hide();
									$('#' + t.appDiv.id + 'csvDesc').hide();
								}
								if (t.config.crsSelected == "Manteo NC"){
									$('#' + t.appDiv.id + 'ceosLink').hide();
								}	
								$('#' + t.appDiv.id + 'downloadDiv').slideDown();
								// Set layer defs on layers id's in dlSspLayers array
								$.each(t.config.dlOspLayers1, lang.hitch(t,function(i,v){
									t.config.layerDefs[v] = "CRS_NAME = '" + t.config.crsSelected + "'"
								})); 							 
								t.dynamicLayer.setLayerDefinitions(t.config.layerDefs);
								t.dynamicLayer1.setLayerDefinitions(t.config.layerDefs);
								$('#' + t.appDiv.id + 'dlAccord1').show();
								$('#' + t.appDiv.id + 'step2').slideDown();
								t.config.visibleLayers = t.config.dlOspLayers;
								t.config.visibleLayers1 = t.config.transLayer;
								t.dynamicLayer.setVisibleLayers(t.config.visibleLayers);
								t.dynamicLayer1.setVisibleLayers(t.config.visibleLayers1);
								//$('.legend').removeClass("hideLegend");
							}
							// user clicked on PIN button
							if (t.config.section == "pin"){
								// placeholder for Community with no OSP parcels (used to be Duck)
								if (t.config.crsSelected == "NP Community"){
									$('#' + t.appDiv.id + 'ch-PIN').prop( "disabled", true );
									$('#' + t.appDiv.id + 'ch-PIN').attr("data-placeholder", "No Parcels");
									$('#' + t.appDiv.id + 'hasParcelsDiv').hide();
									$('#' + t.appDiv.id + 'noParcelsDiv').show();
								}else{
									$('#' + t.appDiv.id + 'ch-PIN').prop( "disabled", false );
									$('#' + t.appDiv.id + 'ch-PIN').attr("data-placeholder", "Find Parcel by PIN");
									$('#' + t.appDiv.id + 'hasParcelsDiv').show();
									$('#' + t.appDiv.id + 'noParcelsDiv').hide();
								}			
								$('#' + t.appDiv.id + 'ch-PIN').trigger("chosen:updated");
								//$('#' + t.appDiv.id + 'crsNameParcel').html(t.config.crsSelected)
								// Set layer defs on layers id's in dlSspLayers array
								$.each(t.config.pinLayers1, lang.hitch(t,function(i,v){
									t.config.layerDefs[v] = "CRS_NAME = '" + t.config.crsSelected + "'"
								})); 							 
								t.dynamicLayer.setLayerDefinitions(t.config.layerDefs);
								t.dynamicLayer1.setLayerDefinitions(t.config.layerDefs);
								t.config.visibleLayers = t.config.pinLayers;
								t.config.visibleLayers1 = t.config.transLayer;
								t.dynamicLayer.setVisibleLayers(t.config.visibleLayers);
								t.dynamicLayer1.setVisibleLayers(t.config.visibleLayers1);
								//$('.legend').removeClass("hideLegend");
								// select all parcels in tax district
								var q = new Query();
								q.returnGeometry = false;
								q.outFields = ["PIN"];
								q.where = "CRS_NAME = '" + t.config.crsSelected + "'";
								t.pinQt.execute(q, lang.hitch(t,function(evt){
									$('body').addClass('waiting');
									$('#' + t.appDiv.id + 'ch-PIN').empty();
									$('#' + t.appDiv.id + 'ch-PIN').append("<option value=''></option>");
									t.f = evt.features;
									$.each(t.f, lang.hitch(t,function(i,v){
										var pin = v.attributes.PIN;
										$('#' + t.appDiv.id + 'ch-PIN').append("<option value='"+pin+"'>"+pin+"</option>");
									}));
									$('#' + t.appDiv.id + 'ch-PIN').trigger("chosen:updated");
									$('#' + t.appDiv.id + 'printWrapper').slideDown();
									$('body').removeClass('waiting');
								}));
							}
							// User clicked on Future OSP button							
							if (t.config.section == "fut"){
								// Set layer defs on layers id's in dlSspLayers array
								$.each(t.config.dlOspLayers1, lang.hitch(t,function(i,v){
									t.config.layerDefs[v] = "CRS_NAME = '" + t.config.crsSelected + "'"
								})); 							 
								this.navigation.clearFuture(t);
								t.dynamicLayer.setLayerDefinitions(t.config.layerDefs);
								t.dynamicLayer1.setLayerDefinitions(t.config.layerDefs);								
								$('#' + t.appDiv.id + 'dlAccord1').hide();
								$('#' + t.appDiv.id + 'step2').slideDown();
								$('#' + t.appDiv.id + 'futureWrapper').slideDown();
								t.config.visibleLayers = t.config.dlOspLayers;
								t.config.visibleLayers1 = t.config.transLayer;
								t.dynamicLayer.setVisibleLayers(t.config.visibleLayers);
								t.dynamicLayer1.setVisibleLayers(t.config.visibleLayers1);
							}	
						}
						// selection was cleared
						else{
							t.crsFL.clear();
							t.config.visibleLayers = [];
							t.config.visibleLayers1 = [];
							t.dynamicLayer.setVisibleLayers(t.config.visibleLayers);
							t.dynamicLayer1.setVisibleLayers(t.config.visibleLayers1);
							//$('.legend').addClass("hideLegend");	
							$('#' + t.appDiv.id + 'step2').slideUp();
							$('#' + t.appDiv.id + 'printWrapper').slideUp();
							$('#' + t.appDiv.id + 'futureWrapper, #' + t.appDiv.id + 'parcelInfo, #' + t.appDiv.id + 'futureGraph').hide();
							this.navigation.clearFuture(t);
							$('#' + t.appDiv.id + 'pinSearch').val('');
							$('#' + t.appDiv.id + 'barf').animate({left : "0%", width: "0%"});
							t.fPinFL.clear();
							$('#' + t.appDiv.id + 'step2 .gExp').show();
							$('#' + t.appDiv.id + 'step2 .gCol, #' + t.appDiv.id + 'step2 .infoOpen').hide();
						}
					}));
					$('#' + t.appDiv.id + 'ch-PIN').chosen().change(lang.hitch(t,function(c, p){
						if (p){
							t.pinSelected = c.currentTarget.value;
							var q = new Query();
							q.where = "CRS_NAME = '" + t.config.crsSelected + "' AND PIN = '" + t.pinSelected + "'";
							t.pinFL.selectFeatures(q,FeatureLayer.SELECTION_NEW);
							$('#' + t.appDiv.id + 'ch-PIN').attr("data-placeholder", "Select More Parcels");
							$("#" + t.appDiv.id + "ch-PIN option[value='" + t.pinSelected + "']").remove();
							if ($('#' + t.appDiv.id + 'ch-PIN option').size() == 1){
								$('#' + t.appDiv.id + 'ch-PIN').attr("data-placeholder", "No More Parcels");
								$('#' + t.appDiv.id + 'ch-PIN').prop( "disabled", true );
							}	
							$('#' + t.appDiv.id + 'ch-PIN').trigger("chosen:updated");
							t.zoomSelectedClass()
							$('#' + t.appDiv.id + 'printAnchorDiv').append(
								"<div class='pinPDFdiv zoomSelected'>" +
									t.pinSelected + ": " + 
									"<a class='pinPDFLinks' id='" + t.appDiv.id + "m-" + t.pinSelected + "'>View Map</a>" +
									" | " + 
									"<a class='pinZoomLinks' id='" + t.appDiv.id + "z-" + t.pinSelected + "'>Zoom</a>" +
								"</div>"
							);	
							$('.pinPDFLinks').on('click',lang.hitch(t,function(e){
								t.zoomSelectedClass(e.currentTarget.parentElement)
								var pin = e.currentTarget.id.split("-").pop()
								window.open("http://crs-maps.coastalresilience.org/" + t.config.crsNoSpace + "_" + pin + ".pdf", "_blank");
							}));	
							$('.pinZoomLinks').on('click',lang.hitch(t,function(e){
								t.pinTracker = "yes"
								var pin = e.currentTarget.id.split("-").pop()
								var q = new Query();
								q.where = "CRS_NAME = '" + t.config.crsSelected + "' AND PIN = '" + pin + "'";
								t.pinFL.selectFeatures(q,FeatureLayer.SELECTION_NEW);	
								t.zoomSelectedClass(e.currentTarget.parentElement)
							}));
						}
					}));
					$('#' + t.appDiv.id + 'ch-FUT').chosen().change(lang.hitch(t,function(c, p){
						if (p){
							var query = new Query();	
							query.where = "OBJECTID = " + c.currentTarget.value;
							t.fPinFL.selectFeatures(query, FeatureLayer.SELECTION_NEW);
						}else{
							t.fPinFL.clear();
							$('#' + t.appDiv.id + 'parcelInfo').slideUp();
						}
					}));			
					
					// Temporarily update the chosen menu's max height.
					$('#' + t.appDiv.id + 'ch-FUT').on('chosen:showing_dropdown',lang.hitch(t,function(evt, params){
						$('.chosen-container .chosen-results').css('max-height', '112px');	
					})); 
					$('#' + t.appDiv.id + 'ch-FUT').on('chosen:hiding_dropdown',lang.hitch(t,function(evt, params){
						$('.chosen-container .chosen-results').css('max-height', '240px');
					})); 
					
				// KEEP FOR SAVE AND SHARE	
					/*
					if (this.config.stateSet == "yes"){
						$('#' + t.appDiv.id + 'ospAppBtn').trigger('click')
						var p = "r"
						$('#' + t.appDiv.id + 'ch-CRS').val('Duck NC').trigger('chosen:updated').trigger('change', p)
					}
					*/
				}));
				$('#' + t.appDiv.id + 'searchPin').on('click',lang.hitch(t,function(){
					$('.accrodBg').addClass('waiting');
					var q = new Query();
					q.returnGeometry = true;
					q.outFields = ['PIN', 'OSP_fpts', 'OSP_fac', 'TAX_VALUE', 'OWNER_TYPE', 'LAND_USE', 'DEED_BK_PG', 'DEED_DATE'];
					q.where = "CRS_NAME = '" + t.config.crsSelected + "' AND PIN = '" + $('#' + t.appDiv.id + 'pinSearch').val() + "'";
					t.fPinFL.selectFeatures(q,FeatureLayer.SELECTION_NEW);
				}));	
				$('#' + t.appDiv.id + 'clearSearchPin').on('click',lang.hitch(t,function(){
					$('#' + t.appDiv.id + 'pinSearch').val('');
					$('#' + t.appDiv.id + 'parcelInfo, #' + t.appDiv.id + 'searchPinNone').slideUp();
					t.fPinFL.clear();
				}));
				$('#' + t.appDiv.id + 'pinSearch').keypress(lang.hitch(t,function(e){
					if(e.which == 13){
						$('#' + t.appDiv.id + 'searchPin').trigger('click')
					}
				}));
				$('#' + t.appDiv.id + 'curElOsp').on('click',lang.hitch(t,function(c){
					if (c.currentTarget.checked){
						t.config.dlOspLayers = [0,9] 
						t.config.visibleLayers = t.config.dlOspLayers;
						t.dynamicLayer.setVisibleLayers(t.config.visibleLayers);
					}else{
						t.config.dlOspLayers = [0] 
						t.config.visibleLayers = t.config.dlOspLayers;
						t.dynamicLayer.setVisibleLayers(t.config.visibleLayers);	
					}	
				}));
				$('#' + t.appDiv.id + 'ImpactAd').on('click',lang.hitch(t,function(c){
					if (c.currentTarget.checked){
						t.config.transLayer = [10]
						t.config.visibleLayers1 = t.config.transLayer;
						t.dynamicLayer1.setVisibleLayers(t.config.visibleLayers1);
					}else{
						t.config.transLayer = []
						t.config.visibleLayers1 = t.config.transLayer;
						t.dynamicLayer1.setVisibleLayers(t.config.visibleLayers1);
					}	
				}));
				// Show Parcels by Query Listeners
				$('#' + t.appDiv.id + 'acresGrThan').on('click',lang.hitch(t,function(){
					$('#' + t.appDiv.id + 'acresLsThan').removeClass('navBtnSel');
					$('#' + t.appDiv.id + 'acresGrThan').addClass('navBtnSel');
					t.config.acreGrLs = ">";
				}));
				$('#' + t.appDiv.id + 'acresLsThan').on('click',lang.hitch(t,function(){
					$('#' + t.appDiv.id + 'acresGrThan').removeClass('navBtnSel');
					$('#' + t.appDiv.id + 'acresLsThan').addClass('navBtnSel');
					t.config.acreGrLs = "<";
				}));
				$('#' + t.appDiv.id + 'taxGrThan').on('click',lang.hitch(t,function(){
					$('#' + t.appDiv.id + 'taxLsThan').removeClass('navBtnSel');
					$('#' + t.appDiv.id + 'taxGrThan').addClass('navBtnSel');
					t.config.taxGrLs = ">";
				}));
				$('#' + t.appDiv.id + 'taxLsThan').on('click',lang.hitch(t,function(){
					$('#' + t.appDiv.id + 'taxGrThan').removeClass('navBtnSel');
					$('#' + t.appDiv.id + 'taxLsThan').addClass('navBtnSel');
					t.config.taxGrLs = "<";
				}));
				$('#' + t.appDiv.id + 'futQuAnd').on('click',lang.hitch(t,function(){
					$('#' + t.appDiv.id + 'futQuOr').removeClass('navBtnSel');
					$('#' + t.appDiv.id + 'futQuAnd').addClass('navBtnSel');
					t.config.futQuAndOr = "AND";
				}));
				$('#' + t.appDiv.id + 'futQuOr').on('click',lang.hitch(t,function(){
					$('#' + t.appDiv.id + 'futQuAnd').removeClass('navBtnSel');
					$('#' + t.appDiv.id + 'futQuOr').addClass('navBtnSel');
					t.config.futQuAndOr = "OR";
				}));
				$('#' + t.appDiv.id + 'futAcreSort').on('click',lang.hitch(t,function(){
					$('#' + t.appDiv.id + 'futTaxSort').removeClass('navBtnSel');
					$('#' + t.appDiv.id + 'futAcreSort').addClass('navBtnSel');
					t.config.futSortOn = "acres";
					t.esriapi.futureDropdown(t);
				}));
				$('#' + t.appDiv.id + 'futTaxSort').on('click',lang.hitch(t,function(){
					$('#' + t.appDiv.id + 'futAcreSort').removeClass('navBtnSel');
					$('#' + t.appDiv.id + 'futTaxSort').addClass('navBtnSel');
					t.config.futSortOn = "taxval";
					t.esriapi.futureDropdown(t);
				}));
				$('#' + t.appDiv.id + 'futAcen').on('click',lang.hitch(t,function(){
					$('#' + t.appDiv.id + 'futDecen').removeClass('navBtnSel');
					$('#' + t.appDiv.id + 'futAcen').addClass('navBtnSel');
					t.config.futSortOrder = "acen";
					t.esriapi.futureDropdown(t);
				}));
				$('#' + t.appDiv.id + 'futDecen').on('click',lang.hitch(t,function(){
					$('#' + t.appDiv.id + 'futAcen').removeClass('navBtnSel');
					$('#' + t.appDiv.id + 'futDecen').addClass('navBtnSel');
					t.config.futSortOrder = "decen";
					t.esriapi.futureDropdown(t);
				}));				
				$('#' + t.appDiv.id + 'queryParcels').on('click',lang.hitch(t,function(){
					$('.accrodBg').addClass('waiting');
					$('#' + t.appDiv.id + 'parcelInfo').slideUp();
					t.fManyPinFL.clear();
					t.fPinFL.clear();
					$('#' + t.appDiv.id + 'fParSelWrapper').slideUp();
					$('#' + t.appDiv.id + 'queryParMany').slideUp();
					$('#' + t.appDiv.id + 'queryParNone').slideUp();			
					var q = new Query();
					q.returnGeometry = true;
					q.outFields = ['PIN', 'OSP_fpts', 'OSP_fac', 'TAX_VALUE', 'OWNER_TYPE', 'LAND_USE', 'DEED_BK_PG', 'DEED_DATE'];
					q.where = "CRS_NAME = '" + t.config.crsSelected + "' AND ( OSP_fac " + t.config.acreGrLs + " " + $('#' + t.appDiv.id + 'futAcreVal').val() + " " + 
						t.config.futQuAndOr + " TAX_VALUE " + t.config.taxGrLs + " " + $('#' + t.appDiv.id + 'futTaxVal').val() + " )";
					t.fManyPinFL.selectFeatures(q,FeatureLayer.SELECTION_NEW);
				}));	
				$('#' + t.appDiv.id + 'toggleFutSort').on('click',lang.hitch(t,function(){
					if ( $('#' + t.appDiv.id + 'toggleFutSort').html() == 'Sort' ){ 	
						$('#' + t.appDiv.id + 'futSortWrapper').slideDown();
						$('#' + t.appDiv.id + 'toggleFutSort').html('Hide Sort');
					}else { 	
						$('#' + t.appDiv.id + 'futSortWrapper').slideUp();
						$('#' + t.appDiv.id + 'toggleFutSort').html('Sort');
					}					
				}));	
			},
			mapPreviewDownload: function(t){
				$('#' + t.appDiv.id + 'allParcelPreview').on('click',lang.hitch(t,function(){
					window.open("http://crs-maps.coastalresilience.org/" + t.config.crsNoSpace + "_AllParcels.pdf", "_blank");
				}));
				$('#' + t.appDiv.id + 'largeParcelPreview').on('click', lang.hitch(t,function(){
					window.open("http://crs-maps.coastalresilience.org/" + t.config.crsNoSpace + "_Parcels_Large.pdf", "_blank");					
				}));
				$('#' + t.appDiv.id + 'setbackParcelPreview').on('click', lang.hitch(t,function(){
					window.open("http://crs-maps.coastalresilience.org/" + t.config.crsNoSpace + "_Setbacks.pdf", "_blank");					
				}));
				$('#' + t.appDiv.id + 'ceosParcelPreview').on('click', lang.hitch(t,function(){
					window.open("http://crs-maps.coastalresilience.org/" + t.config.crsNoSpace + "_CEOS.pdf", "_blank");					
				}));
				// Data download click
				$('#' + t.appDiv.id + 'dlBtn').on('click', lang.hitch(t,function(){
					window.open("http://crs-maps.coastalresilience.org/" + t.config.crsNoSpace + "_Maps.zip", "_parent");
				}));
			},
			toggleInfoSum:function(t){
				$('.expCol').on('click', lang.hitch(t,function(c){
					$(c.currentTarget).children().toggle();
					$(c.currentTarget).parent().find('.infoOpen').slideToggle();
				}));
			}
        });
    }
);