var transformRequest = (url, resourceType) => {
    var isMapboxRequest =
      url.slice(8, 22) === "api.mapbox.com" ||
      url.slice(10, 26) === "tiles.mapbox.com";
    return {
      url: isMapboxRequest
        ? url.replace("?", "?pluginName=sheetMapper&")
        : url
    };
  };
  //YOUR TURN: add your Mapbox token 
  mapboxgl.accessToken = 'pk.eyJ1IjoiaW9zZXJ2aWNlZGVzayIsImEiOiJjanZvaXVhejkxdDh5NDhwYmxqbzE0MmZqIn0.-wFzMVbZTxRePP3py2QbXA'; //Mapbox token 
  var map = new mapboxgl.Map({
    container: 'map', // container id
    style: 'mapbox://styles/ioservicedesk/cjyfq2zsf56wl1ds8p1hc6xb2', //stylesheet location
    center: [145.043982, -37.720710], // starting position
    zoom: 15.5,// starting zoom
    transformRequest: transformRequest
  });

  $(document).ready(function () {
    var score = $('#score');
    var date = $("#date");
    var company = $('#company');
    var type = $('#type');
    var pointData;
    var datesArray;
    var activeIndex = 0;
    var popupContent;
    var popup;
    var popupCoordinate;
    var filterObject = {
      'COMPANY':'All Companies',
      'TYPE':'All Types',
      'SCORE':null,
      'DATE':["1 March 2017", "03 June 2020"]
    };

    var isFilterMode = false;
    var filteredData = {
        "type": "FeatureCollection",
        "features": []
    };

    $.ajax({
      type: "GET",
      //YOUR TURN: Replace with csv export link
      url: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vR80Tz3aJK97IWUH9cCj_3v3128rpllgiVXPMVuLniMs-8NVfWtmGWVSb595hg0vogyVX-f25l61Mxd/pub?output=csv',
      dataType: "text",
      success: function (csvData) { makeGeoJSON(csvData); }
    });



    function makeGeoJSON(csvData) {
      csv2geojson.csv2geojson(csvData, {
        latfield: 'Latitude',
        lonfield: 'Longitude',
        delimiter: ','
      }, function (err, data) {
        pointData = data;

        // update the form inputs
        updateTypeInput();
        updateCompanyInput();
        updateScoreInput();
        updateDateInput();

        // hide the modal
        setTimeout(function(e){
          $('.spinner-modal').css('display', 'none');
        },4000)
        
        var colors = ['#d73027','#fc8d59','#fee08b','#ffffbf','#d9ef8b','#91cf60','#1a9850'];
        // Load the map
        map.on('load', function () {

          //Add the the layer to the map 
          map.addSource('csvData', {
            type: 'geojson',
            data: data,
            cluster:true,
            clusterMaxZoom:14,
            clusterRadius:50
          });

          map.addLayer({
            id: 'csvData',
            type: 'circle',
            source:'csvData',
            filter:['has','point_count'],
            paint: {
              'circle-color': [
                    'step',
                    ['get', 'point_count'],
                    '#51bbd6',
                    100,
                    '#f1f075',
                    750,
                    '#f28cb1'
                ],
                'circle-radius': [
                    'step',
                    ['get', 'point_count'],
                    20,
                    100,
                    30,
                    750,
                    40
                ]
            }
            
        });

        // Count items in a cluster
        map.addLayer({
            id: 'cluster-count',
            type: 'symbol',
            source: 'csvData',
            filter: ['has', 'point_count'],
            layout: {
                'text-field': '{point_count_abbreviated}',
                'text-font': ['DIN Offc Pro Medium', 'Arial Unicode MS Bold'],
                'text-size': 12
            }
        });

        map.addLayer({
            id:'unclustered',
            type:'circle',
            source:'csvData',
            filter:['!', ['has', 'point_count']],
            paint:{
                'circle-radius':8,
                'circle-color': [
                  'match',
                  ['get', 'TYPE'],
                  'TYPEA',
                  colors[0],
                  'TYPEB',
                  colors[1],
                  'TYPEC',
                  colors[2],
                  'TYPED',
                  colors[3],
                  'TYPEE',
                  colors[4],
                  'TYPEF',
                  colors[5],
                  colors[6]
                ],
                'circle-stroke-width':0,
            }

        })
        
        // Uncluster the layers
        map.on('click', 'csvData', function(e){
            var features = map.queryRenderedFeatures(e.point, {
                layers:['csvData']
            });
            console.log(features);

            var clusterId = features[0].properties.cluster_id;
            map.getSource('csvData').getClusterExpansionZoom(
                clusterId,
                function(err, zoom){
                    if(err) return;

                    map.easeTo({
                        center:features[0].geometry.coordinates,
                        zoom:zoom
                    });
                }
            )
        });


          // When a click event occurs on a feature in the csvData layer, open a popup at the
          // location of the feature, with description HTML from its properties.
          map.on('click', 'unclustered', function (e) {
            console.log(e.features);
            var coordinates = e.features[0].geometry.coordinates.slice();

            //set popup text 
            //You can adjust the values of the popup to match the headers of your CSV. 
            // For example: e.features[0].properties.Name is retrieving information from the field Name in the original CSV. 
            var description = `<h3>` + e.features[0].properties.TYPE + `</h3>` + `<h4>` + `<b>` + `COMPANY: ` + `</b>` + e.features[0].properties.COMPANY + `</h4>` + `<h4>` + `<b>` + `SCORE: ` + `</b>` + e.features[0].properties.SCORE + `</h4>`;

            if(e.features.length > 1){
              let features = e.features;
              
              popupContent = features.map(feature => {
                return `<div class="popup-element"><h3><i class="fa fa-caret-left" id="left"></i>` + feature.properties.TYPE + `<i class="fa fa-caret-right" id="right"></i></h3>` + `<h4>` + `<b>` + `COMPANY: ` + `</b>` + 
                  feature.properties.COMPANY + `</h4>` + `<h4>` + `<b>` + `SCORE: ` + `</b>` + feature.properties.SCORE + `</h4></div>`;

              });

              
              description = `<div class="popup-container">${popupContent[0]}</div>`;
              
            }
            // Ensure that if the map is zoomed out such that multiple
            // copies of the feature are visible, the popup appears
            // over the copy being pointed to.
            while (Math.abs(e.lngLat.lng - coordinates[0]) > 180) {
              coordinates[0] += e.lngLat.lng > coordinates[0] ? 360 : -360;
            }

            popupCoordinate = coordinates;
            //add Popup to map

            new mapboxgl.Popup()
              .setLngLat(coordinates)
              .setHTML(description)
              .addTo(map);

              popupClickHandler();
            });


          // Change the cursor to a pointer when the mouse is over the places layer.
          map.on('mouseenter', 'unclustered', function () {
            map.getCanvas().style.cursor = 'pointer';
          });

          // Change it back to a pointer when it leaves.
          map.on('mouseleave', 'unclustered', function () {
            map.getCanvas().style.cursor = '';
          });

          var bbox = turf.bbox(data);
          map.fitBounds(bbox, { padding: 50 });

        });

      });
    };

    // listen to changes in the form input
    type.on('change', function(e) {
        let value = $(this).val();
        console.log(pointData);

        filterObject.TYPE = value;
        filterData(filterObject);
    });

    company.on('change', function(e) {
        let value = $(this).val();

        filterObject.COMPANY = value;
        filterData(filterObject);
    });

    score.on('change', function(e) {
        let value = $(this).val();

        filterObject.SCORE = value;
        filterData(filterObject);
    });

    // filter the data and update the map
    function filterData(criteria) {
        // resetIndex
        activeIndex = 0;

        // remove a popup if open
        var popUps = document.getElementsByClassName('mapboxgl-popup');
        if (popUps[0]) {
          popUps[0].remove();
        }


        filteredData.features = [...pointData.features];
        // Filter type
        if(criteria.TYPE == 'All Types' ){
          
        }else {
          filteredData.features = filteredData.features.filter(feature =>{
            if(feature.properties.TYPE == criteria.TYPE){
                return feature;
            }
          });
        }

        console.log(filteredData);
        // filter company
        if(criteria.COMPANY == 'All Companies' ){
          // return feature;
        }else {
          filteredData.features = filteredData.features.filter(feature =>{

            if(feature.properties.COMPANY == criteria.COMPANY){
                return feature;
            }
          });
        }

        console.log(filteredData);
        // filter score
        if(criteria.SCORE == null){

        }else {
          filteredData.features = filteredData.features.filter(feature =>{
            if(feature.properties.SCORE == criteria.SCORE){
                return feature;
            }
          });
        }

        console.log(filteredData);
        // filter date
        let dates = criteria.DATE;
        filteredData.features = filteredData.features.filter(feature =>{
          if(new Date(feature.properties['DATE']) >= new Date(dates[0]) && 
              new Date(feature.properties['DATE']) <= new Date(dates[1])  
          ){
              return feature;
          }
        });

        console.log(filteredData);
        map.getSource("csvData").setData(filteredData);

        // get layer bounds and fit to the bounds
        if(filteredData.features.length == 0) {
          // notify the user
          let text = "No data matching the criteria found";
          $('.snackbar').text(text).toggleClass('open');

        } else{
          var filterCount = filteredData.features.length - 1;
          var coordinates = filteredData.features.map(feature => feature.geometry.coordinates);
          let latBounds = new mapboxgl.LngLatBounds(coordinates[0], coordinates[filterCount]);
        
          map.fitBounds(latBounds, {
            padding:20
          });
        }
        
    }

    // Update the type
    function updateTypeInput() {
        let types = pointData.features.map(feature => feature.properties.TYPE);
        types = [...new Set(types)];

        // append all types
        types.unshift('All Types');

        // update the option
        createOptions(type, types);
    }

    function updateCompanyInput() {
        let companies = pointData.features.map(feature => feature.properties.COMPANY);
        companies = [...new Set(companies)];

        companies.unshift('All Companies');
        // update the option
        createOptions(company, companies);
    }

    function createOptions(element, list){
        var options = list.map(el=> {
            return `<option value='${el}'>${el}</option>`
        });

        element.append(options);
    }

    function updateScoreInput() {
        let scores = pointData.features.map(feature => feature.properties.SCORE);
        scores = scores.sort((a,b)=> a -b);

        // extract max and min;
        console.log(scores);
        // update the data input
        score.attr({
            'max':scores[scores.length-1],
            'min':scores[0],
            'value':''
        });
    }

    function updateDateInput() {
        let dates = pointData.features.map(feature => feature.properties.DATE);
        dates = [...new Set(dates)];

        // sort the dates
        dates = dates.sort((a,b) => new Date(a) -new Date(b));
        datesArray = [...dates];

        // ge the first and the last
        $('.start-date').text(dates[0]);
        $('.end-date').text(dates[dates.length - 1]);

        // Create the slider
        let max = dates.length-1;

        // call to slider
        dateSlider(max);
    }

    function dateSlider(max){
      $('#date').slider({
        min:0,
        max:max,
        value:[0, max],
        focus:true,
        range:true,
        ticks_tooltip:true       
      }).on('slide', function(e){
        // update the tooltips
        let dates = [datesArray[e.value[0]], datesArray[e.value[1]]];
        
        // update text
        $('.start-date').text(dates[0]);
        $('.end-date').text(dates[1]);
      }).on('slideStop', function(e){
          // filter the data
          let dates = [datesArray[e.value[0]], datesArray[e.value[1]]];

          filterObject.DATE = dates;
          filterData(filterObject );

      }); 
  }

    // reset styles 
    $('#reset-filter').on('click', resetFilter);
    function resetFilter(){
      // reset form values
      updateDateInput();
      $('#date').slider('setValue',[0, datesArray.length-1]);

      updateCompanyInput();
      updateScoreInput()
      updateTypeInput();

      map.getSource('csvData').setData(pointData);
      isFilterMode = !isFilterMode;

      // reset filter object
      filterObject = {
        'COMPANY':'All Companies',
        'TYPE':'All Types',
        'SCORE':null,
        'DATE':["1 March 2017", "03 June 2020"]
      };
    }

    // left and rightbutton
    function popupClickHandler() {
      $('.fa-caret-right').on('click',function(e){
        activeIndex += 1;
        if( activeIndex > popupContent.length-1){
          activeIndex = 0;
        }

        updatePopup(activeIndex);
        
      });

      $('.fa-caret-left').on('click',function(e){
        activeIndex -= 1;
        if( activeIndex < 0){
          activeIndex = popupContent.length-1;
        }

        updatePopup(activeIndex);
        
      });
    }

    // update the popup content
    function updatePopup(index){
      console.log(popupContent[index]);
      new mapboxgl.Popup()
            .setLngLat(popupCoordinate)
            .setHTML(`<div class="popup-container">${popupContent[index]}</div>`)
            .addTo(map);
          
      popupClickHandler();
    }

    // toggle the side-menu
    $('#toggle-menu').on('click', function(e) {
        $('.side-nav').addClass('open-menu');
        $(this).addClass('d-none');
    });

    $('.close-nav').on('click', function(e) {
        $('.side-nav').removeClass('open-menu');
        $('#toggle-menu').removeClass('d-none');
    });
});


