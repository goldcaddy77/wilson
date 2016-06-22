/**
 * Wilson - A simple JS neural network library
 * 
 * Supports:
 * Training data with labels
 * Multiple hidden layers
 * Hidden layer size definition
 * Multiple outputs
 * Import/export of weights
 * Learning
 * Prediction
 * Hyperparameter config
 * Browser and NodeJS environments
 * 
 */

// Neo - A small matrix manipulation class. Strongly tied to the needs of Wilson
// TODO: All methods, except data(), should return a Matrix object
var Matrix = function (dataArray) {
    var data = dataArray;
    
    return {
        data: function () {
            return data;
        },
        add: function (m2) {
            m2 = m2.data();
            var res = [];
            for (var i=0; i < data.length; i++) {
                res[i] = [];
                for (var j=0; j < data[i].length; j++) {
                    res[i][j] = data[i][j] + m2[i][j];
                }
            }
            
            return res;
        },
        subtract: function (m2) {
            m2 = m2.data();
            var res = [];
            for (var i=0; i < data.length; i++) {
                res[i] = [];
                for (var j=0; j < data[i].length; j++) {
                    res[i][j] = data[i][j] - m2[i][j];
                }
            }
            
            return res;
        },
        multiply: function (m2) {
            var result = [];

            // read each row from m2
            for (var i = 0; i < m2.data().length; i++) {
                console.log(i);
                
                result[i] = [];
                
                // read each column from this
                for (var j = 0; j < data[0].length; j++) {
                    var sum = 0;
                    
                    // read each row from this
                    for (var k = 0; k < data.length; k++) {
                        sum += data[k][j] * m2.data()[i][k];
                    }
                    
                    result[i][j] = sum;
                }
            }
            
            return new Matrix(result);
        },
        transform: function (callback) {
            return new Matrix(data.map(function (row) {
                return row.map(callback);
            }));
        },
        transpose: function () {
            // see: http://stackoverflow.com/questions/17428587/transposing-a-2d-array-in-javascript
            return new Matrix(data[0].map(function(col, i) { 
                return data.map(function(row) { 
                    return row[i];
                });
            }));
        },
        populate: function (x, y) {
            var res = [];
            for (var i=0; i < x; i++) {
                res[i] = [];
                for (var j=0; j < y; j++) {
                    res[i][j] = Math.random();
                }
            }
            
            data = res;
        }
    }
};

/**
 * Sigmoid "squashing" function
 */
function sigmoid(t){
   return 1 / (1 + Math.exp(-t));
}

/**
 * Derivitive of Sigmoid function
 */
function sigmoidPrime(t) {
	return (Math.exp(-t) / Math.pow(1 + Math.exp(-t), 2));
}

/**
 * Inputs - training data or real data
 */
var inputs = new Matrix([
    [1,1]
]);

/**
 * Expected output(s)
 */
var target = new Matrix([
    [1]
]);

/**
 * Hidden layer (just one for now), values
 */
var hidden = new Matrix([]);

/**
 * Actual ouput(s) from the network
 */
var outputs;

/**
 * Weights between input(s) > hidden layer (1)
 */
var inputWeights = new Matrix([
    [0.8, 0.4, 0.3],
    [0.2, 0.9, 0.5]
]);

/**
 * Weights between hidden layer (1) > output(s)
 */
var hiddenWeights = new Matrix([
    [0.3, 0.5, 0.9]
]);

/**
 * A scaling factor to control how far we move around the "slope" during back
 * propogation (uses the Gradient Descent algorithm), so we don't miss the
 * hopefully global minimum we're looking for. 
 * Values from 0 - 1
 */
var learningRate = 0.5;

/**
 * Helper function to log the state of the network at a given point
 */
function log(id) {
    // return;
    console.log('STATE AT ' + id);
    console.log('inputs', JSON.stringify(inputs.data(), null, 4));
    console.log('input > hidden weights', JSON.stringify(inputWeights.data(), null, 4));
    console.log('hidden values', JSON.stringify(hidden.data(), null, 4));
    console.log('hidden > output weights', JSON.stringify(hiddenWeights.data(), null, 4));
}

/**
 * Forward propogation
 */
function forward(inputs) {
    // input > hidden
    // multiply the input weights by the inputs
    hidden = inputWeights.multiply(inputs);
    //console.log(hidden.data());
    
    // apply the activation function
    hidden = hidden.transform(sigmoid);
    //console.log(hidden.data());
    //console.log(hiddenWeights.multiply(hidden).data());
    
    // hidden > output
    // multiply the hidden weights by the hidden values and sum the resulting matrix (array)
    var sum = hiddenWeights.multiply(hidden).data()[0].reduce(function(a, b){return a+b;});
    
    // > output
    // return the sum and the result of sum passed through the activation function
    return {
        sum: sum, 
        val: sigmoid(sum)
    };
}

/**
 * Backward propogation
 */
function backward(inputs, guess) {
    var foo = new Matrix([[guess.val]]);
    
    var error = target.subtract(foo).reduce(function(a, b){return a+b;});
    
    var delta = sigmoidPrime(guess.sum) * error;
    delta = parseFloat(delta.toFixed(3));
    //console.log(delta);
    
    // hidden to output weights
    var hiddenBefore = hiddenWeights;
    var deltaWeights = hidden.transform(function (val) {
        return ((delta / val) * learningRate);
    });
    //console.log(deltaWeights.data());
    //console.log('old and new hidden to output weights', hiddenBefore.data(), hiddenWeights.add(deltaWeights));
    hiddenWeights = new Matrix(hiddenWeights.add(deltaWeights));
    
    // input to hidden weights
    var deltaHiddenSum = hiddenBefore.transform(function (val) {
       return parseFloat((delta / val).toFixed(3)); 
    });
    
    //console.log(deltaHiddenSum.data());
    
    var sum = inputWeights.multiply(inputs);
    //console.log(sum.data());
    sum = sum.transform(sigmoidPrime);
    //console.log(sum.data());
    deltaHiddenSum = deltaHiddenSum.multiply(sum);
    deltaHiddenSum = deltaHiddenSum.transform(function (val) {
       return parseFloat((val * learningRate).toFixed(3)); 
    });
    
    //console.log(deltaHiddenSum.data());
 
    var deltaWeights = deltaHiddenSum.multiply(inputs.transpose());
    //console.log(deltaWeights.data());
    var oldInputWeights = inputWeights;
    inputWeights = new Matrix(inputWeights.add(deltaWeights));
    //console.log('old and new input to hidden weights', oldInputWeights.data());
    //console.log(inputWeights.data());
}

/**
 * Train the network on the input(s) and expected output(s)
 */
function learn() {
    var guesses = [];
    log('inital');
    for (var i=0; i < 200; i++) {
        console.log('iteration', i+1);
        var guess = forward(inputs);
        guesses.push(guess);
        log('forward');
        backward(inputs, guess);
        log('backward');
    }
    
    console.log('guesses', guesses);
}

/**
 * Given a trained network provide some (novel) input and get an output
 */
function predict(input) {
        console.log('predicted', forward(input).val);
}

// train
learn();

// test
predict(new Matrix([[1,0]]));