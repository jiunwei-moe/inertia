// inertia.js

(function() {

  // Constants
  var Constants = {
    PIXELS_PER_METRE: 100,
    FORCE: 100, // in Newtons
    FORCE_TIME: -0.1, // in seconds
    INTERVAL: 0.050, // in seconds
    MIN_M: 50, // in kg
    MAX_M: 500, // in kg
    STEP_M: 50, // in kg
    START_M: 250, // in kg
    MIN_R: 40, // in pixels
    MAX_R: 60, // in pixels
    EPSILON: 0.005,
    SCALE_FACTOR: 0.75,
    MARGIN: 20
  };

  // Global variables.
  var canvas = document.getElementById('canvas');
  var stage = new createjs.Stage('canvas');
  var scale = 1;

  // Set up sliders.
  var massSlider = $('#massSlider').slider({
    id: 'massSliderInstance',
    min: Constants.MIN_M,
    max: Constants.MAX_M,
    step: Constants.STEP_M,
    value: Constants.START_M,
    formatter: function(value) {
      return value + ' kg';
    }
  });

  // Set up gauges.
  var speedGauge = new JustGage({
    id: 'gauge',
    value: 0,
    valueFontColor: 'white',
    min: 0,
    max: 5,
    title: 'Spaceship Speed',
    label: 'm/s',
    labelFontColor: 'silver',
    decimals: 1
  });
  var gaugePosition = $('#canvas').offset();
  gaugePosition.left += canvas.width - Constants.MARGIN - $('#gauge').width();
  gaugePosition.top += Constants.MARGIN;
  $('#gauge').css(gaugePosition);

  // Start preloading.
  var manifest = [
    { id: 'left-off', src: 'rocket-left-off.png' },
    { id: 'left-on', src: 'rocket-left-on.png' },
    { id: 'right-off', src: 'rocket-right-off.png' },
    { id: 'right-on', src: 'rocket-right-on.png' },
    { id: 'boom', src: 'boom.png' }
  ];
  var queue = new createjs.LoadQueue(true, 'assets/images/');
  queue.on('complete', handleComplete, this);
  queue.loadManifest(manifest);

  // Used as mission callback.
  var callback = null;

  // Declare shapes.
  var offscreenLeft, offscreenRight;
  var ship;
  var left, right;
  var ship_body, ship_label;
  var ship_body_dc;
  var bomb;
  var bomb_label;
  var boom;
  var simulationObjects = [];

  function reset() {
    ship.x = canvas.width / 2;
    ship.y = canvas.height / 2;

    // setShipMass(Constants.START_M);
    
    ship.velocity = [0, 0];
    ship.acceleration = [0, 0];
    ship.acceleration_period = 0;

    ship.rocketTimes = 0;
    $('#rocketTimes').html(ship.rocketTimes);

    left.image = queue.getResult('left-off');
    right.image = queue.getResult('right-off');

    bomb.x = Constants.MARGIN;
    bomb.y = canvas.height / 2;
    bomb.mass = Constants.START_M;
    bomb.velocity = [0, 0];
    bomb.acceleration  = [0, 0];
    bomb.acceleration_period = 0;
    bomb.visible = false;

    bomb_label.text = '';

    boom.visible = false;

    // Reenable controls.
    massSlider.slider('enable');
    $('#left').prop('disabled', false);
    $('#right').prop('disabled', false);

    callback = null;
  }

  function setShipMass(mass) {
    ship.mass = mass;
    ship_body_dc.radius = massToRadius(ship.mass);
    ship_label.text = ship.mass + ' kg';
    $('#massValue').html(ship.mass);
    massSlider.slider('setValue', ship.mass);
  }

  function massToRadius(mass) {
    return Constants.MIN_R + (mass - Constants.MIN_M) / (Constants.MAX_M - Constants.MIN_M) * 
      (Constants.MAX_R - Constants.MIN_R)
  }

  function checkCollision() {
    if (Math.abs(ship.x - bomb.x) < 100) {
      boom.x = (ship.x + bomb.x) / 2;
      boom.visible = true;
      ship.velocity[0] = 0;
      bomb.velocity[0] = 0;
      callback = null;
      $('#left').prop('disabled', true);
      $('#right').prop('disabled', true);
    }
  }

  function handleComplete() {

    var line = new createjs.Shape();
    line.graphics.s('gray').mt(0, canvas.height/2).lt(canvas.width, canvas.height/2);
    stage.addChild(line);

    ship = new createjs.Container();

    left = new createjs.Bitmap(queue.getResult('left-off'));
    left.x = -left.image.width;
    left.y = -left.image.height / 2;
    ship.addChild(left);

    right = new createjs.Bitmap(queue.getResult('right-off'));
    right.x = 0;
    right.y = -right.image.height / 2;
    ship.addChild(right);

    ship_body = new createjs.Shape();
    ship_body_dc = ship_body.graphics.f('red').s('black').ss(5).dc(0, 0, massToRadius(ship.mass)).command;
    ship.addChild(ship_body);

    ship_label = new createjs.Text('...', '24px Arial', 'white');
    ship_label.textAlign = 'center';
    ship_label.x = 0;
    ship_label.y = -ship_label.getMeasuredHeight() / 2;
    ship.addChild(ship_label);

    ship.x = canvas.width / 2;
    ship.y = canvas.height / 2;
    stage.addChild(ship);
    setShipMass(Constants.START_M);
    simulationObjects.push(ship);

    bomb = new createjs.Container();

    var bomb_body = new createjs.Shape();
    bomb_body.graphics.f('black').s('red').ss(5).dc(0, 0, 10);
    bomb.addChild(bomb_body);

    bomb_label = new createjs.Text('...', '16px Arial', 'yellow');
    bomb_label.textAlign = 'center';
    bomb_label.x = 0;
    bomb_label.y = -30 - bomb_label.getMeasuredHeight() / 2;
    bomb.addChild(bomb_label);

    bomb.x = Constants.MARGIN;
    bomb.y = canvas.height / 2;
    bomb.setSpeed = function(value) {
      bomb.velocity[0] = value;
      bomb_label.text = value + ' m/s';
    }
    stage.addChild(bomb);
    simulationObjects.push(bomb);

    boom = new createjs.Bitmap(queue.getResult('boom'));
    boom.regX = boom.image.width / 2;
    boom.regY = boom.image.height / 2;
    boom.x = canvas.width / 2;
    boom.y = canvas.height / 2;
    boom.visible = false;
    stage.addChild(boom);

    offscreenLeft = new createjs.Text('Spaceship offscreen to the left!', '16px Arial', 'yellow');
    offscreenLeft.textAlign = 'left';
    offscreenLeft.x = Constants.MARGIN;
    offscreenLeft.y = canvas.height/2 + Constants.MARGIN;
    stage.addChild(offscreenLeft);

    offscreenRight = new createjs.Text('Spaceship offscreen to the right!', '16px Arial', 'yellow');
    offscreenRight.textAlign = 'right';
    offscreenRight.x = canvas.width - Constants.MARGIN;
    offscreenRight.y = canvas.height/2 + Constants.MARGIN;
    stage.addChild(offscreenRight);

    // Set up event handlers.
    $('#left').on('click', function() {
      left.image = queue.getResult('left-on');
      if (Constants.FORCE_TIME > 0) {
        $('#left').prop('disabled', true);
        $('#right').prop('disabled', true);
        ship.acceleration[0] = Constants.FORCE / ship.mass;
        ship.acceleration_period = Constants.FORCE_TIME * 1000;
      } else {
        ship.velocity[0] += Constants.FORCE / ship.mass;
        setTimeout(function() {
          left.image = queue.getResult('left-off');
        }, 100);
      }
      $('#rocketTimes').html(++ship.rocketTimes);
    });

    $('#right').on('click', function() {
      right.image = queue.getResult('right-on');
      if (Constants.FORCE_TIME > 0) {
        $('#left').prop('disabled', true);
        $('#right').prop('disabled', true);
        ship.acceleration[0] = -Constants.FORCE / ship.mass;
        ship.acceleration_period = Constants.FORCE_TIME * 1000;  
      } else {
        ship.velocity[0] -= Constants.FORCE / ship.mass;
        setTimeout(function() {
          right.image = queue.getResult('right-off');
        }, 100);
      }
      $('#rocketTimes').html(++ship.rocketTimes);
    });

    $('#reset').on('click', reset);

    $('#missionOne50kg').on('click', function() {
      reset();
      setShipMass(50);
      massSlider.slider('disable');
      bomb.setSpeed(3);
      bomb.visible = true;
      callback = function() {
        if (ship.velocity[0] > 3) {
          $('#missionOne50kgResult').html(ship.rocketTimes + ' times').delay(100).fadeOut().fadeIn('slow');
          $('#left').prop('disabled', true);
          $('#right').prop('disabled', true);
          callback = null;
        }
        checkCollision();
      };
    });

    $('#missionOne250kg').on('click', function() {
      reset();
      setShipMass(250);
      massSlider.slider('disable');
      bomb.setSpeed(3);
      bomb.visible = true;
      callback = function() {
        if (ship.velocity[0] > 3) {
          $('#missionOne250kgResult').html(ship.rocketTimes + ' times').delay(100).fadeOut().fadeIn('slow');
          $('#left').prop('disabled', true);
          $('#right').prop('disabled', true);
          callback = null;
        }
        checkCollision();
      };
    });

    $('#missionOne400kg').on('click', function() {
      reset();
      setShipMass(400);
      massSlider.slider('disable');
      bomb.setSpeed(3);
      bomb.visible = true;
      callback = function() {
        if (ship.velocity[0] > 3) {
          $('#missionOne400kgResult').html(ship.rocketTimes + ' times').delay(100).fadeOut().fadeIn('slow');
          $('#left').prop('disabled', true);
          $('#right').prop('disabled', true);
          callback = null;
        }
        checkCollision();
      };
    });

    $('#missionTwo50kg').on('click', function() {
      reset();
      ship.x = Constants.MARGIN;
      setShipMass(50);
      massSlider.slider('disable');
      ship.velocity[0] = 4;
      bomb.x = canvas.width - 3*Constants.MARGIN;
      bomb.visible = true;
      callback = function() {
        if (ship.velocity[0].toPrecision(2) == '0.0') {
          $('#missionTwo50kgResult').html(ship.rocketTimes + ' times').delay(100).fadeOut().fadeIn('slow');
          $('#left').prop('disabled', true);
          $('#right').prop('disabled', true);
          callback = null;
        }
        checkCollision();
      };
    });

    $('#missionTwo250kg').on('click', function() {
      reset();
      ship.x = Constants.MARGIN;
      setShipMass(250);
      massSlider.slider('disable');
      ship.velocity[0] = 4;
      bomb.x = canvas.width - 3*Constants.MARGIN;
      bomb.visible = true;
      callback = function() {
        if (ship.velocity[0].toPrecision(2) == '0.0') {
          $('#missionTwo250kgResult').html(ship.rocketTimes + ' times').delay(100).fadeOut().fadeIn('slow');
          $('#left').prop('disabled', true);
          $('#right').prop('disabled', true);
          callback = null;
        }
        checkCollision();
      };
    });

    $('#missionTwo500kg').on('click', function() {
      reset();
      ship.x = Constants.MARGIN;
      setShipMass(500);
      massSlider.slider('disable');
      ship.velocity[0] = 4;
      bomb.x = canvas.width - 3*Constants.MARGIN;
      bomb.visible = true;
      callback = function() {
        if (ship.velocity[0].toPrecision(2) == '0.0') {
          $('#missionTwo500kgResult').html(ship.rocketTimes + ' times').delay(100).fadeOut().fadeIn('slow');
          $('#left').prop('disabled', true);
          $('#right').prop('disabled', true);
          callback = null;
        }
        checkCollision();
      };
    });

    /* $('#zoomIn').on('click', function() {
      scale /= Constants.SCALE_FACTOR;
    });

    $('#zoomOut').on('click', function() {
      scale *= Constants.SCALE_FACTOR;
    }); */

    massSlider.on('change', function(event) {
      setShipMass(event.value.newValue);
    });

    // Reset simulation.
    reset();
    $('#left').prop('disabled', true);
    $('#right').prop('disabled', true);

    // Set up ticker.
    createjs.Ticker.addEventListener("tick", handleTick);

  }

  function handleTick(event) {
    stage.scaleX = stage.scaleY = scale;
    stage.x = (canvas.width / 2) * (1 - scale);
    stage.y = (canvas.height / 2) * (1 - scale);

    if (!event.paused) {
      if (callback) callback();

      $.each(simulationObjects, function(index, obj) {

        var delta = event.delta;

        if (obj.acceleration_period > 0) {
          if (obj.acceleration_period < delta) {
            obj.x += (obj.velocity[0] * obj.acceleration_period / 1000.0 + 
              0.5 * obj.acceleration[0] * Math.pow(obj.acceleration_period / 1000.0, 2)) * Constants.PIXELS_PER_METRE;
            obj.velocity[0] += obj.acceleration[0] * obj.acceleration_period / 1000.0;
            obj.acceleration[0] = 0;
            delta -= obj.acceleration_period;

            if (Math.abs(obj.velocity[0]) < Constants.EPSILON) obj.velocity[0] = 0;

            if (obj == ship) {
              left.image = queue.getResult('left-off');
              right.image = queue.getResult('right-off');
              $('#left').prop('disabled', false);
              $('#right').prop('disabled', false);
            }
          } else {
            obj.acceleration_period -= delta;
          }
        }

        obj.x += (obj.velocity[0] * delta / 1000.0 + 
          0.5 * obj.acceleration[0] * Math.pow(delta / 1000.0, 2)) * Constants.PIXELS_PER_METRE;
        obj.velocity[0] += obj.acceleration[0] * delta / 1000.0;

        if (Constants.FORCE_TIME <= 0) {
          if (Math.abs(obj.velocity[0]) < Constants.EPSILON) obj.velocity[0] = 0;
        }

      });
      
      speedGauge.refresh(Math.abs(ship.velocity[0]));
      $('#velocityMagnitude').html(Math.abs(ship.velocity[0]).toPrecision(2));
      if (ship.velocity[0] > 0) {
        $('#velocityDirection').html('Right');
      } else if (ship.velocity[0] < 0) {
        $('#velocityDirection').html('Left');
      } else {
        $('#velocityDirection').html('No Direction');
      }

      offscreenLeft.visible = (ship.x < 0);
      offscreenRight.visible = (ship.x > canvas.width);
    }

    stage.update();
  }

})();

$(function() {
  $('[data-toggle="tooltip"]').tooltip({ container: 'body' });
});
