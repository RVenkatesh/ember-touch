var set = Em.set;
var get = Em.get;
var outerdiv;
var application;
var i, l;

var pinchStartWasCalled = false;
var pinchChangeWasCalled = false;
var pinchEndWasCalled = false;

var panStartWasCalled = false;
var panChangeWasCalled = false;
var panEndWasCalled = false;

var tapEndWasCalled = false;
var PinchPanView, OuterView;

module("Nested gesture recognizers", {
  setup: function() {

    pinchStartWasCalled = false;
    pinchChangeWasCalled = false;
    pinchEndWasCalled = false;

    panStartWasCalled = false;
    panChangeWasCalled = false;
    panEndWasCalled = false;

    tapEndWasCalled = false;

    PinchPanView = Em.ContainerView.extend({
      scale: 1,

      translate: {
        x: 0,
        y: 0
      },

      pinchStart: function(recognizer) {
        pinchStartWasCalled = true;
        this.scale = recognizer.get('scale');
      },

      pinchChange: function(recognizer) {
        pinchChangeWasCalled = true;
        this.scale = recognizer.get('scale');
      },

      pinchEnd: function(recognizer) {
        pinchChangeWasCalled = true;
        this.scale = recognizer.get('scale');
      },

      panOptions: {
        numberOfRequiredTouches: 2
      },

      panStart: function(recognizer) {
        panStartWasCalled = true;
        this.translate = recognizer.get('translation');
      },

      panChange: function(recognizer) {
        panChangeWasCalled = true;
        this.translate = recognizer.get('translation');
      },

      panEnd: function(recognizer) {
        panEndWasCalled = true;
        this.translate = recognizer.get('translation');
      }
    });

    OuterView = PinchPanView.extend({
      elementId: 'outer-div',
      childViews: ['nestedView'],

      nestedView: PinchPanView.extend({
        elementId: 'nested-div',
        classNames: ['nestedId'],

        tapEnd: function(recognizer) {
          tapEndWasCalled = true;
        },

        panOptions: {
          numberOfRequiredTouches: 2
        }
      })
    });

    Em.run(function() {
      application = Ember.Application.create({
        router: null,
        ready: function () {
          outerdiv = OuterView.create({});
          outerdiv.append();
          start();
        }
        
      });
      stop();
    });

  },

  teardown: function() {
    Em.run(function() {
      outerdiv.destroy();
      application.destroy();
    });
  }
});

test("Tap on the nested div", function() {

  // ====================================
  // Make it start

  var touchEvent = jQuery.Event('touchstart');
  touchEvent['originalEvent'] = {
    targetTouches: [
      {
        identifier: 0,
        pageX: 0,
        pageY: 10
      }
    ]
  };

  $('#nested-div').trigger(touchEvent);

  var gestures = get(get(outerdiv.nestedView, 'eventManager'), 'gestures');
  ok (gestures, "gestures should be defined");
  equal(gestures.length, 3, 'should be three gestures defined');

  for (i=0, l=gestures.length; i<l; i++) {

    switch (gestures[i].name){
      case 'pinch': 
        equal( get(gestures[i], 'state'), Em.Gesture.WAITING_FOR_TOUCHES, 'pinch should be waiting for touches');
        break;
      case 'pan': 
        equal( get(gestures[i], 'state'), Em.Gesture.WAITING_FOR_TOUCHES, 'pan should be waiting for touches');
        break;
      case 'tap': 
        equal( get(gestures[i], 'state'), Em.Gesture.BEGAN, 'tap should be started');
        break;
    }

  }

  // ===================================
  // lift finger

  touchEvent = jQuery.Event('touchend');
  touchEvent['originalEvent'] = {
    changedTouches: [
      {
        identifier: 0,
        pageX: 0,
        pageY: 10
      }
    ]
  };

  $('#nested-div').trigger(touchEvent);

  // I don't know what order they're in
  for (i=0, l=gestures.length; i<l; i++) {

    if (gestures[i].name === 'tap' ){
      equal(get(gestures[i], 'state'), Em.Gesture.ENDED, 'tap should be ended');
    }

  }

  ok(tapEndWasCalled, 'tap end should have been called');
});
test("Simultaneous pinch and pan on the outer div", function() {


  // ====================================
  // Make it possible

  var touchEvent = jQuery.Event('touchstart');
  touchEvent['originalEvent'] = {
    targetTouches: [
      {
        identifier: 0,
        pageX: 0,
        pageY: 10
      },
      {
        identifier: 1,
        pageX: 10,
        pageY: 10
      }
    ]
  };

  $('#outer-div').trigger(touchEvent);

  // ====================================
  // Start with pan

  touchEvent = jQuery.Event('touchmove');
  touchEvent['originalEvent'] = {
    changedTouches: [
      {
        identifier: 0,
        pageX: 10,
        pageY: 20
      },
      {
        identifier: 1,
        pageX: 20,
        pageY: 20
      }
    ]
  };

  $('#outer-div').trigger(touchEvent);

  var gestures = get(get(outerdiv, 'eventManager'), 'gestures');
  ok (gestures, "gestures should be defined");
  equal(gestures.length, 2, 'should be two gestures defined');

  if (get(gestures[0], 'name') === 'pinch') {
    equal(get(gestures[0], 'state'), Em.Gesture.POSSIBLE, 'pinch should be possible');
    equal(get(gestures[1], 'state'), Em.Gesture.BEGAN, 'pan should have started');
  } 
  else if (get(gestures[0], 'name') === 'pan') {
    equal(get(gestures[0], 'state'), Em.Gesture.BEGAN, 'pinch should be possible');
    equal(get(gestures[1], 'state'), Em.Gesture.POSSIBLE, 'pan should have started');
  }

  ok(panStartWasCalled, "Pan start was called");
  equal(outerdiv.translate.x,10,'move right 5px');
  equal(outerdiv.translate.y,10,'move down 10px');

  // ===================================
  // Pan and pinch simultaneously

  touchEvent = jQuery.Event('touchmove');
  touchEvent['originalEvent'] = {
    changedTouches: [
      {
        identifier: 0,
        pageX: 20,
        pageY: 30
      },
      {
        identifier: 1,
        pageX: 40,
        pageY: 30
      }
    ]
  };

  $('#outer-div').trigger(touchEvent);

  gestures = get(get(outerdiv, 'eventManager'), 'gestures');
  ok (gestures, "gestures should be defined");
  equal(gestures.length, 2, 'should be two gestures defined');

  // I don't know what order they're in
  if (get(gestures[0], 'name') === 'pinch') {
    equal(get(gestures[0], 'state'), Em.Gesture.BEGAN, 'pinch should be possible');
    equal(get(gestures[1], 'state'), Em.Gesture.CHANGED, 'pan should have started');
  } 
  else if (get(gestures[0], 'name') === 'pan') {
    equal(get(gestures[0], 'state'), Em.Gesture.CHANGED, 'pinch should be possible');
    equal(get(gestures[1], 'state'), Em.Gesture.BEGAN, 'pan should have started');
  }

  ok(panChangeWasCalled, "panChange was called");
  ok(pinchStartWasCalled, "pinchStart was called");

  equal(outerdiv.translate.x,15,'move right another 10px');
  equal(outerdiv.translate.y,10,'move down another 10px');

  equal(outerdiv.scale,2,'double the scale');
});
test("one finger down on nested one, other on outer", function() {

  // ====================================
  // Put first finger down on nested div

  var touchEvent = jQuery.Event('touchstart');
  touchEvent['originalEvent'] = {
    targetTouches: [
      {
        identifier: 0,
        pageX: 10,
        pageY: 10
      }
    ]
  };

  $('#nested-div').trigger(touchEvent);

  var gestures = get(get(outerdiv.nestedView, 'eventManager'), 'gestures');
  ok (gestures, "gestures should be defined");
  equal(gestures.length, 3, 'should be three gestures defined');

  for (var i=0, l=gestures.length; i<l; i++) {
    switch ( gestures[i].name ){
      case 'pinch': 
        equal(get(gestures[i], 'state'), Em.Gesture.WAITING_FOR_TOUCHES, 'pinch should be waiting for touches');
      break;
      case 'pan': 
        equal(get(gestures[i], 'state'), Em.Gesture.WAITING_FOR_TOUCHES, 'pan should be waiting for touches');
      break;
      case 'tap': 
        equal(get(gestures[i], 'state'), Em.Gesture.BEGAN, 'tap should be started');
      break;
    }
  }


  // ====================================
  // put second finger on outer div

  touchEvent = jQuery.Event('touchstart');
  touchEvent['originalEvent'] = {
    targetTouches: [
      {
        identifier: 1,
        pageX: 10,
        pageY: 20
      }
    ]
  };

  $('#outer-div').trigger(touchEvent);

  gestures = get(get(outerdiv, 'eventManager'), 'gestures');
  ok (gestures, "gestures should be defined");
  equal(gestures.length, 2, 'should be two gestures defined');

  for (i=0, l=gestures.length; i<l; i++) {
    switch ( gestures[i].name ){
      case 'pinch': 
        equal(get(gestures[i], 'state'), Em.Gesture.POSSIBLE, 'pinch should be waiting for touches');
      break;
      case 'pan': 
        equal(get(gestures[i], 'state'), Em.Gesture.POSSIBLE, 'pan should be waiting for touches');
      break;
    }
  }
  
  // ====================================
  // pinch and pan

  touchEvent = jQuery.Event('touchmove');
  touchEvent['originalEvent'] = {
    changedTouches: [
      {
        identifier: 0,
        pageX: 20,
        pageY: 5
      },
      {
        identifier: 1,
        pageX: 20,
        pageY: 25
      }
    ]
  };

  $('#outer-div').trigger(touchEvent);

  gestures = get(get(outerdiv, 'eventManager'), 'gestures');
  equal(gestures.length, 2, 'should be two gestures defined');

  for (i=0, l=gestures.length; i<l; i++) {
    switch ( gestures[i].name ){
      case 'pinch': 
        equal(get(gestures[i], 'state'), Em.Gesture.BEGAN, 'pinch should be waiting for touches');
      break;
      case 'pan': 
        equal(get(gestures[i], 'state'), Em.Gesture.BEGAN, 'pan should be waiting for touches');
      break;
    }
  }

  ok(panStartWasCalled, "panStart was called");
  ok(pinchStartWasCalled, "pinchStart was called");

  equal(outerdiv.translate.x,10,'move right another 10px');
  equal(outerdiv.translate.y,0,'no y axis change');

  equal(outerdiv.scale,2,'double the scale');

  // ===================================
  // lift finger

  touchEvent = jQuery.Event('touchend');
  touchEvent['originalEvent'] = {
    changedTouches: [
      {
        identifier: 0,
        pageX: 0,
        pageY: 10
      },
      {
        identifier: 1,
        pageX: 0,
        pageY: 10
      }
    ]
  };

  $('#nested-div').trigger(touchEvent);

  // I don't know what order they're in
  for (i=0, l=gestures.length; i<l; i++) {
    switch (gestures[i].name){
      case 'pinch': 
        equal(get(gestures[i], 'state'), Em.Gesture.ENDED, 'pinch should be ended');
      break;
      case 'pan': 
        equal(get(gestures[i], 'state'), Em.Gesture.ENDED, 'pan should be ended');
      break;
      case 'tap': 
        equal(get(gestures[i], 'state'), Em.Gesture.ENDED, 'tap should be ended');
      break;
    }
  }

});

test("one finger down on container view, other on nested view", function() {

  // ====================================
  // Put first finger down on nested div

  var touchEvent = jQuery.Event('touchstart');
  touchEvent['originalEvent'] = {
    targetTouches: [
      {
        identifier: 0,
        pageX: 10,
        pageY: 10
      }
    ]
  };

  $('#outer-div').trigger(touchEvent);

  var gestures = get(get(outerdiv, 'eventManager'), 'gestures');
  ok (gestures, "gestures should be defined");
  equal(gestures.length, 2, 'should be two gestures defined');

  for (i=0, l=gestures.length; i<l; i++) {
    switch (gestures[i].name){
      case 'pinch': 
        equal(get(gestures[i], 'state'), Em.Gesture.WAITING_FOR_TOUCHES, 'pinch should be waiting for touches');
      break;
      case 'pan': 
        equal(get(gestures[i], 'state'), Em.Gesture.WAITING_FOR_TOUCHES, 'pan should be waiting for touches');
      break;
    }
  }

  // ====================================
  // put second finger on nested div

  touchEvent = jQuery.Event('touchstart');
  touchEvent['originalEvent'] = {
    targetTouches: [
      {
        identifier: 1,
        pageX: 10,
        pageY: 20
      }
    ]
  };

  $('#nested-div').trigger(touchEvent);

  gestures = get(get(outerdiv.nestedView, 'eventManager'), 'gestures');
  ok (gestures, "gestures should be defined");
  equal(gestures.length, 3, 'should be three gestures defined');

  for (i=0, l=gestures.length; i<l; i++) {
    switch (gestures[i].name){
      case 'pinch': 
        equal(get(gestures[i], 'state'), Em.Gesture.WAITING_FOR_TOUCHES, 'pinch should be waiting for touches');
      break;
      case 'pan': 
        equal(get(gestures[i], 'state'), Em.Gesture.WAITING_FOR_TOUCHES, 'pan should be waiting for touches');
      break;
      case 'tap': 
        equal(get(gestures[i], 'state'), Em.Gesture.BEGAN, 'tap should have begun');
      break;
    }
  }
  
  // ====================================
  // pinch and pan

  touchEvent = jQuery.Event('touchmove');
  touchEvent['originalEvent'] = {
    changedTouches: [
      {
        identifier: 0,
        pageX: 20,
        pageY: 5
      },
      {
        identifier: 1,
        pageX: 20,
        pageY: 25
      }
    ]
  };

  $('#outer-div').trigger(touchEvent);

  gestures = get(get(outerdiv, 'eventManager'), 'gestures');
  equal(gestures.length, 2, 'should be two gestures defined');

  for ( i=0, l=gestures.length; i<l; i++) {
    switch ( gestures[i].name ){
      case 'pinch': 
        equal(get(gestures[i], 'state'), Em.Gesture.BEGAN, 'pinch should be waiting for touches');
      break;
      case 'pan': 
        equal(get(gestures[i], 'state'), Em.Gesture.BEGAN, 'pan should be waiting for touches');
      break;
    }
  }

  ok(panStartWasCalled, "panStart was called");
  ok(pinchStartWasCalled, "pinchStart was called");

  equal(outerdiv.translate.x,10,'move right another 10px');
  equal(outerdiv.translate.y,0,'no y axis change');

  equal(outerdiv.scale,2,'double the scale');

  equal(tapEndWasCalled, false, 'tapEnd should not have been called');

  // ===================================
  // lift finger

  touchEvent = jQuery.Event('touchend');
  touchEvent['originalEvent'] = {
    changedTouches: [
      {
        identifier: 0,
        pageX: 0,
        pageY: 10
      },
      {
        identifier: 1,
        pageX: 0,
        pageY: 10
      }
    ]
  };

  $('#nested-div').trigger(touchEvent);

  // I don't know what order they're in
  for ( i=0, l=gestures.length; i<l; i++) {
    switch ( gestures[i].name ){
      case 'pinch': 
        equal(get(gestures[i], 'state'), Em.Gesture.ENDED, 'pinch should be ended');
      break;
      case 'pan': 
        equal(get(gestures[i], 'state'), Em.Gesture.ENDED, 'pan should be ended');
      break;
      case 'tap': 
        equal(get(gestures[i], 'state'), Em.Gesture.ENDED, 'tap should be ended');
      break;
    }
  }

});
