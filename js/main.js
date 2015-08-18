/**
 * Created by sergiy on 11.08.15.
 */

'use strict';

$(function() {

	// init google map
	Map.initMap();

	// init Location object
	Location.init();

	// init User object
	User.init();

	// by default, show list of users
	User.displayAllUsers();

	$("[name=listOfUsers]").click(User.displayAllUsers.bind(User));
	$("[name=addLocation]").click(Location.displayNewLocationBlock.bind(Location));
	$("[name=showOnlyMeOnMap]").click(Map.cleanAllUserMarkers.bind(Map));
	$("[name=showAllMarkersOnMap]").click(Map.showAllUserMarkers.bind(Map));
	$("[name=editMyInfo]").click(User.editMyInfo.bind(User));
});

var clearWorkspace = function() {
	$("[name=workspace]").children().detach();
};

var User = {

	myLatitude: false,
	myLongitude: false,

	init: function() {
		this.usersBlock = $("[name=usersBlock]").detach().css("display", "block");
		this.editUserBlock = $("[name=editUserBlock]").detach().css("display", "block");
		this.editUserBlock.find('button.editInfo').click(this.saveMyInfo.bind(this));

		// load all users from database
		this.getAllUsers();
		// get my location on map
		this.getMyLocation();
	},

	getAllUsers: function() {
		$.ajax({
			url: "data/users.json",
			type: "get",
			dataType: "json"
		}).done(this.getAllUsersDone.bind(this));
	},

	getAllUsersDone: function(users) {

		// compile template for one user
		var oneUserCompiledTemplateFunc = _.template(
			'<div class="user <%= isOdd ? \"odd\" : \"\" %>">' +
				'<div class="name"><%= username %></div>' +
				'<div class="address"><%= address %></div>' +
					'<div class="seeLocations">' +
					'<span>See Locations</span>' +
					'<div class="icon"></div>' +
					'<div class="number"><%= number %></div>' +
				'</div>' +
			'</div>');

		// remove any users which might be in the users container
		var usersContainer = this.usersBlock.find("[name=users]").empty();

		for (var i = 0; i < users.length; i++) {

			// add user's location on map
			Map.addUserOnMap(users[i].latitude, users[i].longitude, users[i].username);

			// build html code for one user
			var user = oneUserCompiledTemplateFunc({
				isOdd: (i % 2) == 1,
				username: users[i].username,
				address: users[i].latitude + " " + users[i].longitude,
				number: Math.floor((Math.random() * 100))
			});

			// make from html a jQuery object
			var $user = $(user);

			$user.find(".seeLocations").click(this.seeLocationClick.bind(this));

			// append html of one user into users container
			usersContainer.append($user);
		}
	},

	// handle click event on particular 'See Location' block
	seeLocationClick: function(event) {

		// getting the name of the user
		var userNameFromClickedLocation = $(event.target).parent().parent().find(".name").text();

		// scroll to the map
		$(window).scrollTop( $("#map").position().top );

		// go thr each marker and find the right one
		for (var i = 0 ; i < Map.markersOnMap.length; i++) {
			var marker = Map.markersOnMap[i];

			var userNameFromMarker = marker.title;

			if (userNameFromClickedLocation === userNameFromMarker) {

				// change its color
				marker.setIcon("http://maps.google.com/mapfiles/ms/icons/green-dot.png");

				// get back its color in 3 seconds
				var funcToCall = (function(markerToChange){
					return function(){
						markerToChange.setIcon("http://maps.google.com/mapfiles/ms/icons/red-dot.png");
					};
				})(marker);

				setTimeout(funcToCall, 3000);
			}
		}
	},

	getMyLocation: function() {
		var self = this;

		// get geolocation
		navigator.geolocation.getCurrentPosition(function (position) {
			console.log("Got my GPS coords: ", position.coords);

			self.myLatitude = position.coords.latitude;
			self.myLongitude = position.coords.longitude;

			Map.displayMyPositionOnMap(self.myLatitude, self.myLongitude);
		});
	},

	displayAllUsers: function() {
		clearWorkspace();
		$("[name=workspace]").append(this.usersBlock);
	},

	editMyInfo: function() {
		clearWorkspace();
		$("[name=workspace]").append(this.editUserBlock);
		
		var self = this;

		$.ajax({
			url: "data/myUserInfo.json",
			type: "get",
			dataType: "json"
		}).done(function(userInfo) {
			
			self.editUserBlock.find("[name=inputForFirstName]").val(userInfo.firstname);
			self.editUserBlock.find("[name=inputForLastName]").val(userInfo.lastname);
			self.editUserBlock.find("[name=email]").val(userInfo.email);
			self.editUserBlock.find("[name=password]").val("");
			self.editUserBlock.find("[name=country]").val(userInfo.country);
			self.editUserBlock.find("[name=state]").val(userInfo.state);
			self.editUserBlock.find("[name=suburb]").val(userInfo.suburb);
			self.editUserBlock.find("[name=zip]").val(userInfo.zip);
		});
	},

	saveMyInfo: function() {

		var self = this;

		if (Location.validateForm() === true) {

			$.ajax({
				url: "saveMyUserInfo.php",
				type: "post",
				data: {
					firstName: $('[name=inputForFirstName]').val(),
					lastName: $('[name=inputForLastName]').val(),
					email: $('[name=email]').val(),
					password: $('[name=password]').val(),
					country: $("[name=country]").val(),
					state: $("[name=state]").val(),
					suburb: $("[name=suburb]").val(),
					zip: $("[name=zip]").val()
				}
			})
				.done(function(data){
					self.displayAllUsers();
				})
				.fail(function(){

				});
		}
	}
};

var Map = {

	markersOnMap: [],

	lvivCoords: {lat: 49.843280, lng: 24.028375},

	initMap: function() {

		// init google map
		var mapCanvas = document.getElementById('map');

		var mapOptions = {
			center: new google.maps.LatLng(this.lvivCoords.lat, this.lvivCoords.lng),
			zoom: 14,
			mapTypeId: google.maps.MapTypeId.ROADMAP
		};

		this.googleMap = new google.maps.Map(mapCanvas, mapOptions);
	},

	addUserOnMap: function(lat, lng, username) {

		var marker = new google.maps.Marker({
			position: {
				lat: lat,
				lng: lng
			},
			map: this.googleMap,
			title: username,
			icon: "http://maps.google.com/mapfiles/ms/icons/red-dot.png"
		});

		this.markersOnMap.push(marker);

		marker.addListener('click', this.userOnMapClick.bind(this));
	},

	displayMyPositionOnMap: function(lat, lng) {
		new google.maps.Marker({
			position: {
				lat: lat,
				lng: lng
			},
			map: this.googleMap,
			title: "Me",
			icon: {
				path: google.maps.SymbolPath.CIRCLE,
				scale: 6
			}
		});
	},

	userOnMapClick: function (event) {

		// check if we have our own coordinates
		if (User.myLatitude === false && User.myLongitude === false) {
			return;
		}

		var distance = google.maps.geometry.spherical.computeDistanceBetween(
			new google.maps.LatLng(event.latLng.lat(), event.latLng.lng()),
			new google.maps.LatLng(User.myLatitude, User.myLongitude)
		) / 1000;

		alert(distance.toFixed(3) + " kilometers");
	},

	showAllUserMarkers: function() {
		for (var i = 0; i < this.markersOnMap.length; i++) {
			var marker = this.markersOnMap[i];
			marker.setMap(this.googleMap);
		}
	},

	cleanAllUserMarkers: function() {
		for (var i = 0; i < this.markersOnMap.length; i++) {
			var marker = this.markersOnMap[i];
			marker.setMap(null);
		}
	}
};

var Location = {

	init: function() {
		this.newLocationBlock = $("[name=addLocationBlock]").detach().css("display", "block");

		this.newLocationBlock.find('button.addLocation').click(this.addLocationClick.bind(this));
	},

	displayNewLocationBlock: function() {

		clearWorkspace();

		$("[name=workspace]").append(this.newLocationBlock);
	},

	addLocationClick: function () {
		// check if we have our own coordinates
		if (User.myLatitude === false && User.myLongitude === false) {
			alert("Sorry, we don't have your coordinates");
			return;
		}

		if (this.validateForm() === true) {

			$.ajax({
				url: "addLocation.php",
				type: "post",
				data: {
					firstName: $('[name=inputForFirstName]').val(),
					lastName: $('[name=inputForLastName]').val(),
					email: $('[name=email]').val(),
					password: $('[name=password]').val(),
					country: $("[name=country]").val(),
					state: $("[name=state]").val(),
					suburb: $("[name=suburb]").val(),
					zip: $("[name=zip]").val(),
					latitude: User.myLatitude,
					longitude: User.myLongitude
				}
			})
				.done(function(data){

				})
				.fail(function(){

				});
		}
	},

	validateForm: function () {
		var re,
			firstName = $('[name=inputForFirstName]'),
			lastName = $('[name=inputForLastName]'),
			email = $('[name=email]'),
			password = $('[name=password]'),
			passwordValue = password.val(),
			error = $('[name=error]'),
			checkEm = /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;


		if (firstName.val() === "") {
			alert("Error: Specify First Name!");
			firstName.focus();
			return false;
		}

		if (lastName.val() === "") {
			alert("Error: Specify Last Name!");
			lastName.focus();
			return false;
		}

		if (!checkEm.test(email.val())) {
			alert("Error: Please enter a valid email address. For example: email@gmail.com");
			email.focus();
			return false;
		}

		re = /^\w+$/;
		if (!re.test(passwordValue)) {
			alert("Error: Password must contain only letters, numbers and underscores!");
			password.focus();
			return false;
		}
		if (passwordValue.length < 8) {
			alert("Error: Password must contain at least eight characters!");
			password.focus();
			return false;
		}
		re = /[0-9]/;
		if (!re.test(passwordValue)) {
			alert("Error: password must contain at least one number (0-9)!");
			password.focus();
			return false;
		}
		re = /[a-z]/;
		if (!re.test(passwordValue)) {
			alert("Error: password must contain at least one lowercase letter (a-z)!");
			password.focus();
			return false;
		}
		re = /[A-Z]/;
		if (!re.test(passwordValue)) {
			alert("Error: password must contain at least one uppercase letter (A-Z)!");
			password.focus();
			return false;
		}

		return true;
	}
};