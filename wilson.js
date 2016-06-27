/**
 * Wilson - A simple JS neural network
 * IBM Watson's very distant cousin
 * 
 * Supports:
 * Training data with labels - PARTIAL, needs fixing for repeated labels
 * Multiple hidden layers - Restructure: layers[], weights[] vs specific vars?
 * Hidden layer size definition - DONE
 * Multiple outputs - DONE
 * Import/export of weights - DONE
 * Learning - DONE
 * Prediction - DONE
 * Hyperparameter config - DONE 
 * Browser and NodeJS environments
 * HTAN/custom activation function - DONE
 * 
 * TODO:
 * Softmax for probability of each output
 * Selection of most likely output(s) 
 * Biases?
 * Drop out?
 * Activation function per layer?
 * Annealing of learning rate
 * Tests
 * Back prop algorithm: SGD, BFGS, Mini-Batch GD...?
 * Learn best network topology?
 * 
 * Inspired and heavily influenced by:
 * https://github.com/stevenmiller888/mind
 * http://stevenmiller888.github.io/mind-how-to-build-a-neural-network/
 * https://www.youtube.com/watch?v=bxe2T-V8XRs
 * https://github.com/harthur/brain/blob/master/lib/neuralnetwork.js
 * http://iamtrask.github.io/2015/07/12/basic-python-network/
 * http://iamtrask.github.io/2015/07/27/python-network-part2/
 * http://www.wildml.com/2015/09/implementing-a-neural-network-from-scratch/
 * https://www.mathsisfun.com/calculus/derivatives-introduction.html
 * http://sebastianruder.com/optimizing-gradient-descent/
 * 
 * @author Mike Timms <mike@codeeverything.com>
 */

/**
 * Dependencies
 * 
 * Linear Algebra - for Matrix manipulation: https://www.npmjs.com/package/linear-algebra
 */
var linearAlgebra = require('linear-algebra')(),    // initialise it 
Matrix = linearAlgebra.Matrix;

/**
 * Populates a Matrix of dimensions (x, y) with random values from the Guassian distribution 
 * 
 * @see https://github.com/stevenmiller888/sample 
 * @param int x - Number of columns
 * @param int y - Number of rows
 * @return Matrix
 */
Matrix.prototype.populate = function (x, y) {
    function sample() {
        return Math.sqrt(-2 * Math.log(Math.random())) * Math.cos(2 * Math.PI * Math.random());
    }
    
    var res = [];
    for (var i=0; i < x; i++) {
        res[i] = [];
        for (var j=0; j < y; j++) {
            res[i][j] = Math.random() - 1;
        }
    }
    
    return new Matrix(res);
}

/**
 * Wilson "class"
 */

// export Wilson
module.exports = Wilson;

function Wilson(opts) {
    // config options
    opts = opts || {};
    
    // hyper-paramters
    var hiddenNodes;    // number of hidden neurons
    var iterations;  // number of iterations
    var learningRate;
    
    // TOOD - Predefined or user defined. If user defined cannot save()?
    var activation;
    var activationPrime;
    
    // confgigure the network
    config();
    
    // weights and values
    
    /**
     * Hidden layer (just one for now), values
     */
    var hidden = new Matrix([]);
    
    /**
     * Weights between input(s) > hidden layer (1)
     */
    var inputWeights = new Matrix([]);
    
    /**
     * Weights between hidden layer (1) > output(s)
     */
    var hiddenWeights = new Matrix([]);
    
    var labels = [];
    
    /**
     * Sigmoid activation function
     * Returns a value between 0 and 1
     * 
     * @param number val - The value to apply the function to
     * @return number
     */
    function sigmoid(val){
       return 1 / (1 + Math.exp(-val));
    }
    
    /**
     * Sigmoid value to derivitive
     * 
     * @see: http://math.stackexchange.com/questions/78575/derivative-of-sigmoid-function-sigma-x-frac11e-x
     * @param number val - The value to apply the function to
     * @return number
     */
    function sigmoidPrime(val) {
        return val * (1-val);
    }
    
    /**
     * Hyperbolic tan activation function
     * Returns a value between -1 and 1
     * 
     * @param number val - The value to apply the function to
     * @return number
     */
    function tanh(val) {
        return Math.tanh(val);
    }
    
    /**
     * Hyperbolic tan value to derivative
     * 
     * @see: http://math2.org/math/derivatives/more/hyperbolics.htm
     * @param number val - The value to apply the function to
     * @return number
     */
    function tanhPrime(val) {
        return val * (1 - val);
    }
    
    /**
     * Helper function to log the state of the network at a given point
     */
    function log(id) {
        console.log('STATE AT ' + id);
        console.log('input > hidden weights', JSON.stringify(inputWeights.data(), null, 4));
        console.log('hidden values', JSON.stringify(hidden.data(), null, 4));
        console.log('hidden > output weights', JSON.stringify(hiddenWeights.data(), null, 4));
    }
    
    /**
     * Map predicted results to output classes/labels
     * 
     * @param Matrix prediction - The ouput of the predict() function
     * @return mixed
     */
    function getLabel(prediction) {
        // get array and read first (and only) entry
        prediction = prediction.toArray()[0];
        // find the index from this array with the max value. see: http://stackoverflow.com/questions/11301438/return-index-of-greatest-value-in-an-array
        var bestIdx = prediction.indexOf(Math.max.apply(Math, prediction));
        // return the corrosponding output/class label
        return labels[bestIdx];
    }
    
    /**
     * Appy configuration options to the network
     */
    function config() {
        hiddenNodes = opts.hiddenNodes || 3;    // number of hidden neurons
        iterations = opts.iterations || 10000;  // number of iterations
        learningRate = opts.learningRate || 0.1;
        activation = opts.activation || (typeof opts.activation === 'string' ? opts.activation == 'sigmoid' ? sigmoid : opts.activation == 'tanh' ? tanh : sigmoid : sigmoid);    // activation function
        activationPrime = opts.activationPrime || (typeof opts.activation === 'string' ? opts.activation == 'sigmoidPrime' ? sigmoidPrime : opts.activation == 'tanhPrime' ? tanhPrime : sigmoidPrime : sigmoidPrime); // derivitive of activation function
    }
    
    /**
     * Forward propogation
     * Computes the network node values given the current set of weights.
     * Returns the resulting output(s)
     * 
     * @param Matrix inputs - The input data
     * @return Matrix
     */
    function forward(inputs) {
        // input > hidden
        // multiply the input weights by the inputs
        hidden = inputs.dot(inputWeights).map(function (val) {
            return activation(val);
        });
        
        // hidden > output
        // multiply the hidden weights by the hidden values and sum the resulting matrix (array)
        var sum = hidden.dot(hiddenWeights).map(function (val) {
            return activation(val);
        });
        
        // > output
        return sum;
    }
    
    /**
     * Backward propogation
     * Uses Stochastic Gradient Descent to optimise
     * 
     * @param Matrix inputs - The training data
     * @param Matrix guess - The result of the forward propagation step
     * @param Matrix target - The target output(s)
     * @return Matrix
     */
    function backward(inputs, guess, target) {
        // output layer error
        var error = guess.minus(target);
        
        var outputDelta = error.mul(guess.map(activationPrime));
        
        // hidden layer error
        var hiddenLayerError = outputDelta.dot(hiddenWeights.trans());
        var hiddenLayerDelta = hiddenLayerError.mul(hidden.map(activationPrime));
        
        // adjust hidden > output weights
        hiddenWeights = hiddenWeights.minus(hidden.trans().dot(outputDelta).map(function (val) {
            return val * learningRate;
        }));
        
        // adjust input > hidden weights
        inputWeights = inputWeights.minus(inputs.trans().dot(hiddenLayerDelta).map(function (val) {
            return val * learningRate;
        }));
        
        // return the error
        return error
    }
    
    // expose methods and properties
    return {
        /**
         * Given some inputs and target output(s), learn
         * 
         * @param array inputs - The input/training data
         * @param array target - The target output value(s)
         * @return void
         */
        learn: function (inputs, target, report) {
            // first configure the network
            config();
            
            // learn the outputs from the inputs
            
            // build the target/output layer based on the labels/classes given as targets
            var outputLayer = Matrix.zero(target.length, inputs.length).toArray();
            for (var idx in target) {
                outputLayer[idx][idx] = 1;
                labels[idx] = target[idx];
            }
            
            // set as matrix
            inputs = new Matrix(inputs);
            target = new Matrix(outputLayer);
            
            // initialize weights
            inputWeights = inputWeights.populate(inputs.toArray()[0].length, hiddenNodes);
            hiddenWeights = hiddenWeights.populate(hiddenNodes, target.toArray()[0].length);
            
            // learn yourself something
            for (var i=0; i < iterations; i++) {
                var error = backward(inputs, forward(inputs), target);
                
                // output error margin every 1000 iterations
                if (i % 1000 == 0) {
                    var err = (function(err) {
                        return Math.abs(error.trans().toArray()[0].reduce(function (a, b) {
                            return a + b;
                        }) / error.trans().toArray()[0].length);
                    })(error);
                    
                    if (report) {
                        console.log('Error after ', i, 'iterations', err);
                    }
                }
            }
        },
        /**
         * Given an input value(s) predict the ouput(s)
         * 
         * @param array input - The input
         * @param float expected - The expected output
         * @return float
         */
        predict: function (input, expected) {
            // TODO: Support multiple inputs and outputs
            // first configure the network
            config();
            
            // https://en.wikipedia.org/wiki/Softmax_function
            function softmax(p) {
                var exp = p.map(function (val) {
                    return Math.exp(val);
                });
                
                // np.exp(z) / np.sum(np.exp(z))
                var sum = exp.getSum();
                return exp.map(function (val) {
                    return val / sum;
                });
            }
            
            // predict the output from the input
            var prediction = forward(new Matrix(input));
            console.log('predicted', softmax(prediction).toArray(), getLabel(prediction), 'expected', expected);
            return prediction.toArray();
        },
        /**
         * Configure property(s) of the network after initialisation
         * 
         * @param object conf - JSON object holding config data
         * @return void
         */
        configure: function (conf) {
            // update any current config with values passed
            for (var op in conf) {
                opts[op] = conf[op];
            }
        },
        /**
         * Save the network config and state
         * 
         * @return string
         */
        save: function () {
            // return a JSON string of the weights/parameters
            return JSON.stringify({
                hyperParams: {
                    hiddenNodes: opts.hiddenNodes,
                    // iterations: opts.iterations,
                    // learningRate: opts.learningRate
                },
                weights: [
                    inputWeights.toArray(),
                    hiddenWeights.toArray()
                ]
            });
        },
        /**
         * Configure the network with a previously saved instance
         * 
         * @param string config - A JSON string representing the network state
         * @return void
         */
        load: function (config) {
            // load the given network config (weights and hyper-parameters)
            config = JSON.parse(config);
            
            // setup
            opts = {
                hiddenNodes: config.hyperParams.hiddenNodes,
                iterations: config.hyperParams.iterations,
                learningRate: config.hyperParams.learningRate
            };
            
            // load up the values
            config();
            
            inputWeights = config.weights[0];
            hiddenWeights = config.weights[1];
        }
    }
}