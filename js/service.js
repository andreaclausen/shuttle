/**
 * service.js
 *
 * Computer Science 50
 * Problem Set 8
 *
 * Implements a shuttle service.
 */

// default height
var HEIGHT = 0.8;

// default latitude
var LATITUDE = 42.3745615030193;

// default longitude
var LONGITUDE = -71.11803936751632;

// default heading
var HEADING = 1.757197490907891;

// default number of seats
var SEATS = 10;

// default velocity
var VELOCITY = 50;

// global reference to shuttle's marker on 2D map
var bus = null;

// global reference to 3D Earth
var earth = null;

// global reference to 2D map
var map = null;

// global reference to shuttle
var shuttle = null;

// load version 1 of the Google Earth API
google.load("earth", "1");

// load version 3 of the Google Maps API
google.load("maps", "3", {other_params: "sensor=false"});

// once the window has loaded
$(window).load(function() {

    // listen for keydown anywhere in body
    $(document.body).keydown(function(event) {
        return keystroke(event, true);
    });

    // listen for keyup anywhere in body
    $(document.body).keyup(function(event) {
        return keystroke(event, false);
    });

    // listen for click on Autopilot button
     $("#autopilot").click(function(event) {
        autopilot();
    });
    
    // listen for click on Drop Off button
    $("#dropoff").click(function(event) {
        dropoff();
    });

    // listen for click on Pick Up button
    $("#pickup").click(function(event) {
        pickup();
    });
    
    // listen for click on Teleport button
    $("#teleport").click(function(event) {
        teleport();
    });

    // load application
    load();
    
});

// unload application
$(window).unload(function() {
    unload();
});

/**
 * Automatically drives to the nearest passenger.
 */

function autopilot()
{   
    // global variable to detect if autopilot is onn
    closest = null;
    
    // find nearest passenger
    for (var i = 0; i < PASSENGERS.length; i++)
    { 
        var passenger = PASSENGERS[i];
        
        // check if passenger is eligible to picked up (i.e. not a freshman)
        for (var house in HOUSES)
        {
            if (house == passenger.house)
            {
                passenger.freshman = false;
                break;
            }
            else
            {
                passenger.freshman = true;
            }  
        }
        
        // get passenger's location
        var location = passenger.placemark.getGeometry();
        
        // calculate distance from shuttle
        passenger.distance = shuttle.distance(location.getLatitude(), location.getLongitude());
        
        // set first eligible passenger as the currently closest passenger
        if (closest == null)
        {
           if (passenger.freshman == false && PASSENGERS[i].inshuttle !== true)
           {
               closest = passenger;
           }
        }
        
        // on all other iterations check if this passenger is closer
        else if (closest !== null)
        {
            if (passenger.distance < closest.distance && passenger.freshman == false && PASSENGERS[i].inshuttle !== true)
            {
                closest = passenger;
            }
        }
      
    }
    
    // move shuttle
    // bearing formula taken from: http://www.movable-type.co.uk/scripts/latlong.html
    
    //shuttle longitude
    var λ1 = shuttle.position.longitude * Math.PI / 180;
    //shuttle latitude
    var φ1 = shuttle.position.latitude * Math.PI / 180;
     
    // destination longitude
    var λ2 = closest.placemark.getGeometry().getLongitude() * Math.PI / 180;
    // destination latitude
    var φ2 = closest.placemark.getGeometry().getLatitude() * Math.PI / 180;
    
    // calculate bearing
    var y = Math.sin(λ2-λ1) * Math.cos(φ2);
    var x = Math.cos(φ1)*Math.sin(φ2) - Math.sin(φ1)*Math.cos(φ2)*Math.cos(λ2-λ1);
    var brng = (Math.atan2(y, x))/* * 180 / Math.PI*/;
    
    // turn shuttle
    shuttle.headingAngle = brng;
    
    // move shuttle forward
    shuttle.states.movingForward = true;
    clear();    
    return false;
    
}

/**
 * Renders seating chart.
 */
function chart()
{
    /*var html = "<ol start='0'>";
    for (var i = 0; i < shuttle.seats.length; i++)
    {
        if (shuttle.seats[i] == null)
        {
            html += "<li>Empty Seat</li>";
        }
        else
        {
            html += "<li>" + shuttle.seats[i].name + " - " + shuttle.seats[i].house + "</li>";
        }
    }
    html += "</ol>";
    $("#chart").html(html);*/
    
    var html = "<table class='table table-hover table-condensed'>";
    for (var i = 0; i < shuttle.seats.length; i++)
    {
        if (shuttle.seats[i] == null)
        {
            html += "<tr>";
            html += "<td><div id='thumbnail'><span>E</span></div></td>";
            html += "<td>Empty Seat</td>";
            html += "<td></td>";
            html += "</tr>"; 
        }
        else
        {
            html += "<tr>";
            
            html += "<td><div id='thumbnail'><img src='img/" + shuttle.seats[i].username + ".jpg'></div></td>";
            html += "<td>" + shuttle.seats[i].name + "</td>";
            html += "<td>" + shuttle.seats[i].house + "</td>";
            html += "</tr>";
        } 
    }
    html += "</table>";
    $("#chart").html(html);  
}

/**
 * Creates a dropdown menu with all houses.
 */

function dropdown()
{
    var html = "<select id='houses'>";
    for (var house in HOUSES)
    {
        html += "<option value='" + house +  "'>" + house + "</option>";
    }
    html += "</select>";
    $("#dropdown").html(html);
}

/**
 * Drops off passengers if their stop is nearby.
 */
function dropoff()
{
    // keep track of dropoffs
    var dropoff = false;
    
    // go through each passenger
    for (var i = 0; i < shuttle.seats.length; i++)
    {
        var passenger = shuttle.seats[i];
        
        if (passenger !== null)
        {   
            // check if within 30 metres of their house
            for (var house in HOUSES)
            {
                if (house == passenger.house)
                {
                    var latitude = HOUSES[house].lat;
                    var longitude = HOUSES[house].lng;
                   
                    if (shuttle.distance(latitude, longitude) <= 30)
                    {
                        shuttle.seats[i] = null;
                        chart();
                        dropoff = true;
                    }
                }
            }
        }
    }
    
    if (dropoff == false)
    {
        $("#announcements").html("No house within 30 meters.");
    }
    
    // remove passengers from shuttle
}

/**
 * Called if Google Earth fails to load.
 */
function failureCB(errorCode) 
{
    // report error unless plugin simply isn't installed
    if (errorCode != ERR_CREATE_PLUGIN)
    {
        alert(errorCode);
    }
}

/**
 * Handler for Earth's frameend event.
 */
function frameend() 
{
    // if in autopilot mode, stop shuttle when close to passenger
    if (closest !== null)
    {
        if (shuttle.distance(closest.placemark.getGeometry().getLatitude(), closest.placemark.getGeometry().getLongitude()) <= 5)
        {
            shuttle.states.movingForward = false;
            closest = null;
            pickup();
        }
    }
    
    shuttle.update();
}

/**
 * Called once Google Earth has loaded.
 */
function initCB(instance) 
{
    // retain reference to GEPlugin instance
    earth = instance;

    // specify the speed at which the camera moves
    earth.getOptions().setFlyToSpeed(100);

    // show buildings
    earth.getLayerRoot().enableLayerById(earth.LAYER_BUILDINGS, true);

    // disable terrain (so that Earth is flat)
    earth.getLayerRoot().enableLayerById(earth.LAYER_TERRAIN, false);

    // prevent mouse navigation in the plugin
    earth.getOptions().setMouseNavigationEnabled(false);

    // instantiate shuttle
    shuttle = new Shuttle({
        heading: HEADING,
        height: HEIGHT,
        latitude: LATITUDE,
        longitude: LONGITUDE,
        planet: earth,
        seats: SEATS,
        velocity: VELOCITY
    });

    // synchronize camera with Earth
    google.earth.addEventListener(earth, "frameend", frameend);

    // synchronize map with Earth
    google.earth.addEventListener(earth.getView(), "viewchange", viewchange);

    // update shuttle's camera
    shuttle.updateCamera();

    // show Earth
    earth.getWindow().setVisibility(true);

    // render seating chart
    chart();
    
    // render dropdown
    dropdown();

    // populate Earth with passengers and houses
    populate();
}

/**
 * Handles keystrokes.
 */
function keystroke(event, state)
{
    // ensure we have event
    if (!event)
    {
        event = window.event;
    }

    // left arrow
    if (event.keyCode == 37)
    {
        shuttle.states.turningLeftward = state;
        clear();
        return false;
    }

    // up arrow
    else if (event.keyCode == 38)
    {
        shuttle.states.tiltingUpward = state;
        clear();
        return false;
    }

    // right arrow
    else if (event.keyCode == 39)
    {
        shuttle.states.turningRightward = state;
        clear();
        return false;
    }

    // down arrow
    else if (event.keyCode == 40)
    {
        shuttle.states.tiltingDownward = state;
        clear();
        return false;
    }

    // A, a
    else if (event.keyCode == 65 || event.keyCode == 97)
    {
        shuttle.states.slidingLeftward = state;
        clear();
        return false;
    }

    // D, d
    else if (event.keyCode == 68 || event.keyCode == 100)
    {
        shuttle.states.slidingRightward = state;
        clear();
        return false;
    }
  
    // S, s
    else if (event.keyCode == 83 || event.keyCode == 115)
    {
        shuttle.states.movingBackward = state;
        clear();     
        return false;
    }

    // W, w
    else if (event.keyCode == 87 || event.keyCode == 119)
    {
        shuttle.states.movingForward = state;
        clear();    
        return false;
    }
  
    return true;
}

/**
 * Loads application.
 */
function load()
{
    // embed 2D map in DOM
    var latlng = new google.maps.LatLng(LATITUDE, LONGITUDE);
    map = new google.maps.Map($("#map").get(0), {
        center: latlng,
        disableDefaultUI: true,
        mapTypeId: google.maps.MapTypeId.ROADMAP,
        scrollwheel: false,
        zoom: 17,
        zoomControl: true
    });

    // prepare shuttle's icon for map
    bus = new google.maps.Marker({
        icon: "https://maps.gstatic.com/intl/en_us/mapfiles/ms/micons/bus.png",
        map: map,
        title: "you are here"
    });

    // embed 3D Earth in DOM
    google.earth.createInstance("earth", initCB, failureCB);
}

/**
 * Picks up nearby passengers.
 */
function pickup()
{ 

    var pickedup = false;
    var seats = true;
    var nearby = false;

    // go through each person
    for (var i = 0; i < PASSENGERS.length; i++)
    { 
        // get passenger's location
        var passenger = PASSENGERS[i];
        var location = passenger.placemark.getGeometry();
        
        
        // only if shuttle is within 15 metres of a passenger
        if (shuttle.distance(location.getLatitude(), location.getLongitude()) <= 15 && passenger.inshuttle !== true)
        {
            // check if passenger is freshman
            for (var house in HOUSES)
            {
                if (house == passenger.house)
                {
                    passenger.freshman = false;
                    var freshman = false;
                    break;
                }
                else
                {
                    passenger.freshman = true;
                    var freshman = true;
                }  
            }
            
            nearby = true;
            
            // only if passenger is not on the shuttle already
            if (passenger.inshuttle !== true)
            {
                // only if passenger is not a freshman
                if (passenger.freshman == false)
                {
                    // only if shuttle has seats
                    for (var j = 0; j < shuttle.seats.length; j++)
                    {
                        if (shuttle.seats[j] == null)
                        {
                            seats = true;
                            
                            // give passenger a seat
                            shuttle.seats[j] = passenger;
                        
                            // call chart to update #seats (and update chart)
                            chart();
                            
                            // call picture to update picture
                            picture(passenger.username, passenger.name);
                            
                            // update name
                            updateName(passenger.name);
                            
                            // remove placemark from 3D earth
                            var features = earth.getFeatures();
                            features.removeChild(passenger.placemark);
                    
                            // remove marker from map
                            passenger.marker.setMap(null);
                            
                            // take note that the passenger was picked up
                            passenger.inshuttle = true;
                            PASSENGERS[i].inshuttle = true;
                            
                            // remember that someone was picked up
                            pickedup = true;
                            
                            break;
                        }
                        else
                        {
                            seats = false;
                        } 
                    }
                
                    // display announcement if all seats are full
                    if (seats == false)
                    {
                        $("#announcements").html("There a no empty seats on the shuttle.");
                        break;
                    }
                }
            }
        }  
    }

    if (nearby == true && freshman == true && pickedup == false)
    {
        // display announcement
        $("#announcements").html("This person is a freshman.");
    }
    else if (pickedup == false && seats !== false)
    {
        // display announcement
        $("#announcements").html("No passengers within 15 meters.");
    }
    
     
}

/**
 * Updates picture
 */
 
function picture(username, name)
{
    var html = '<img src="img/';
    html += username;
    html += '.jpg" alt='
    html += name;
    html += '>';
    $("#picture").html(html);
} 

/**
 * Updates name
 */

function updateName(name)
{
    $("#name").html("Welcome on board, " + name + "!");
}

/**
 * Clears announcements.
 */

function clear()
{
    $("#announcements").html("No announcements at this time..");
}
 
/**
 * Populates Earth with passengers and houses.
 */
function populate()
{
    // mark houses
    for (var house in HOUSES)
    {
        // plant house on map
        new google.maps.Marker({
            icon: "https://google-maps-icons.googlecode.com/files/home.png",
            map: map,
            position: new google.maps.LatLng(HOUSES[house].lat, HOUSES[house].lng),
            title: house
        });
    }

    // get current URL, sans any filename
    var url = window.location.href.substring(0, (window.location.href.lastIndexOf("/")) + 1);

    // scatter passengers
    for (var i = 0; i < PASSENGERS.length; i++)
    {
        // pick a random building
        var building = BUILDINGS[Math.floor(Math.random() * BUILDINGS.length)];

        // prepare placemark
        var placemark = earth.createPlacemark("");
        placemark.setName(PASSENGERS[i].name + " to " + PASSENGERS[i].house);

        // prepare icon
        var icon = earth.createIcon("");
        icon.setHref(url + "/img/" + PASSENGERS[i].username + ".jpg");

        // prepare style
        var style = earth.createStyle("");
        style.getIconStyle().setIcon(icon);
        style.getIconStyle().setScale(4.0);

        // prepare stylemap
        var styleMap = earth.createStyleMap("");
        styleMap.setNormalStyle(style);
        styleMap.setHighlightStyle(style);

        // associate stylemap with placemark
        placemark.setStyleSelector(styleMap);

        // prepare point
        var point = earth.createPoint("");
        point.setAltitudeMode(earth.ALTITUDE_RELATIVE_TO_GROUND);
        point.setLatitude(building.lat);
        point.setLongitude(building.lng);
        point.setAltitude(0.0);

        // associate placemark with point
        placemark.setGeometry(point);

        // add placemark to Earth
        earth.getFeatures().appendChild(placemark);

        // add marker to map
        var marker = new google.maps.Marker({
            icon: "https://maps.gstatic.com/intl/en_us/mapfiles/ms/micons/man.png",
            map: map,
            position: new google.maps.LatLng(building.lat, building.lng),
            title: PASSENGERS[i].name + " at " + building.name
        });

        // remember passenger's placemark and marker for pick-up's sake
        PASSENGERS[i].placemark = placemark;
        PASSENGERS[i].marker = marker;
    }
}

/**
 * Teleports shuttle to a house on campus.
 */
function teleport()
{
    // take note which house the user selected
    var selection = $('#houses').val();
    
    // get the houses' latitude and longitude
    for (var house in HOUSES)
    {
        if (house == selection)
        {
            var latitude = HOUSES[house].lat;
            var longitude = HOUSES[house].lng;
            break;
        }
    }
    
    // update shuttle's position
    shuttle.localAnchorCartesian = 
        V3.latLonAltToCartesian([latitude, longitude, shuttle.position.altitude]);
}

/**
 * Handler for Earth's viewchange event.
 */
function viewchange() 
{
    // keep map centered on shuttle's marker
    var latlng = new google.maps.LatLng(shuttle.position.latitude, shuttle.position.longitude);
    map.setCenter(latlng);
    bus.setPosition(latlng);
}

/**
 * Unloads Earth.
 */
function unload()
{
    google.earth.removeEventListener(earth.getView(), "viewchange", viewchange);
    google.earth.removeEventListener(earth, "frameend", frameend);
}
