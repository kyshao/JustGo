"use strict";
const assert = require('chai').assert;
const Game = require('../Game');
const constants = require('../constants');
const Rule = require('../Rule');

function newGame(size, hotseat) {
    let board = [];
    for (var i = 0; i < size; i++) {
        board[i] = new Array(size).fill(constants.empty);
    }

    const game = new Game({
        board: board,
        turn: constants.black,
        moveHistory: [],
        hotseatMode: hotseat,
        clientColor: constants.black,
        active: true,
        winner: null,
        whiteMsRemaining: constants.startingTimePool,
        blackMsRemaining: constants.startingTimePool,
        username: 'guest'
    });

    return game;
}

describe('Game of size 3: turn checking', function() {

    const game = newGame(3, false);

    it('should not allow white to move initially', function(done) {
        let gameExceptionThrown = false;
		//console.log("before attempt to move",game.board);
        try {      
            game.makeMove(0, 0, constants.white, false);
        } catch (err) {
            debugger;
            if (err instanceof Rule.GameException) {
                gameExceptionThrown = true;
            }
        }
        assert(gameExceptionThrown);
        assert.equal(game.board[0][0], constants.empty);
		//console.log("after attempt to move",game.board);
        done();
    });

    it('should switch turn from black to white after black move', function(done) {
        assert.equal(game.turn, constants.black);
        game.makeMove(0, 0, constants.black, false);
        assert.equal(game.board[0][0], constants.black);
        assert.equal(game.turn, constants.white);
        done();
    });

    it('should not allow move from black after the black move', function(done) {
        let gameExceptionThrown = false;
        try {      
            game.makeMove(1, 1, constants.black, false);
        } catch (err) {
            if (err instanceof Rule.GameException) {
                gameExceptionThrown = true;
            }
        }
        assert(gameExceptionThrown);
        assert.equal(game.board[1][1], constants.empty);
        done();      
    })

    it('should switch turn from white to black after white move', function(done) {
        assert.equal(game.turn, constants.white);
        game.makeMove(1, 1, constants.white, false);
        assert.equal(game.board[1][1], constants.white);
        assert.equal(game.turn, constants.black);
        done();
    });
});

describe('Game of size 3: Cannot pass when not your turn', function() {
    const game = newGame(3, false);
    it('initially it should not allow pass from white', function(done) {
        assert.equal(game.turn, constants.black);
        let gameExceptionThrown = false;
        try {
            game.makeMove(0, 0, constants.white, true)
        } catch (err) {
            if (err instanceof Rule.GameException) 
                gameExceptionThrown = true;
        }
        assert(gameExceptionThrown);
        assert.equal(game.turn, constants.black);
        done();
    });
        
})

describe('Game of size 3: double passing throw exception', function() {
    const game = newGame(3, false);
    it('should allow first pass from black', function(done) {
        game.makeMove(null, null, constants.black, true);
        
        for (let i = 0; i < game.board.length; i++) 
            for (let j = 0; j < game.board.length; j++) 
                assert.equal(game.board[i][j], constants.empty);
            
        assert.equal(game.turn, constants.white);
        done();
    });

    it('should throw DoublePassException if white passes after black', function(done) {  
        let doublePassExceptionThrown = false;
        try {
            game.makeMove(null, null, constants.white, true);
        } catch (err) {
            if (err instanceof Rule.DoublePassException) {
                doublePassExceptionThrown = true;
            }
        }
        assert(doublePassExceptionThrown);
        done();
    });    
})


describe('Game of size 3: passing is okay if not sequential', function() {
    const game = newGame(3, false);
    it('should allow first pass from black', function(done) {
        game.makeMove(null, null, constants.black, true);
        
        for (var row of game.board) 
            for (var tile of row) 
                assert.equal(tile, constants.empty);
        
        assert.equal(game.turn, constants.white);
        done();
    });

    it('should allow next move from white', function(done) {
        game.makeMove(0, 0, constants.white, false);
        assert.equal(game.board[0][0], constants.white);
        done();
    })

    it('should allow pass from black again', function(done) {
        game.makeMove(null, null, constants.black, true);
        assert.equal(game.turn, constants.white);
        done();
    })
});


describe('Game of size 3: board checking', function() {
    
    it('should update the board', function() {
        for (var y = 0; y < 3; y++) {
          for (var x = 0; x < 3; x++) {
            var game = newGame(3, false);
            assert.equal(game.board[y][x], constants.empty);
            game.makeMove(x, y, constants.black, false);
            assert.equal(game.board[y][x], constants.black);
          }
      }
    });

    it('should not allow move onto occupied place', function() { // this test doesn't work
        var gameExceptionThrown = false;
        var game = newGame(3, false);
        game.board[0][0] = constants.black;

        try {
            game.makeMove(0, 0, constants.black, false);
        } catch (e) {
            if (e instanceof Rule.GameException) {
            gameExceptionThrown = true; 
            }
        } 
        assert.equal(game.board[0][0], constants.black);
        assert.equal(game.turn, constants.black);
        assert(gameExceptionThrown);
    }); 
    
});


describe('Testing ko rule', function() {
    
    it('should throw GameException for violation of ko rule', function() {
		var W = constants.white;
		var B = constants.black;
		var game = newGame(5, false);
		game.board =  [ [ 0, 0, B, W, 0 ],
						[ 0, B, 0, 0, W ],
						[ 0, 0, B, W, 0 ],
						[ 0, 0, 0, 0, 0 ],
						[ 0, 0, 0, 0, 0 ] ];
		game.makeMove("pass", "pass", B, true);
console.log(game.board);
		game.makeMove(2, 1, W, false);
console.log(game.board);
		game.makeMove(3, 1, B, false);
console.log(game.board);
		try{
			game.makeMove(2, 1, W, false);
		}catch(err){
			assert.equal(err.message, "You cannot play a move which may lead to an infinite game");
		}
	});
});

describe("Game of size 5: capturing and suicide", function() {

  describe('makeMove() capture pieces testing', function() {
    it('Should capture piece at (1, 1)', function() {
      var game = newGame(5, false);
      var W = constants.white;
      var B = constants.black;
	  //following 2 lines are needed to ensure moveHistory exists
	  game.turn = W;
	  game.makeMove("pass", "pass", W, true);
      game.board = [[0, B, 0, 0, 0],
                    [B, W, 0, 0, 0],
                    [0, B, 0, 0, 0],
                    [0, 0, 0, 0, 0]
                    [0, 0, 0, 0, 0]];
					
      game.makeMove(2, 1, B, false);
      assert.equal(game.board[1][1], constants.empty);
    });

    it('Should capture pieces at (3, 1) and (2, 1)', function() {
      var game = newGame(5, false);
      var W = constants.white;
      var B = constants.black;
	  game.turn = W;
	  game.makeMove("pass", "pass", W, true);
      game.board = [[0, B, B, 0, 0],
                    [B, W, W, 0, 0],
                    [0, B, B, 0, 0],
                    [0, 0, 0, 0, 0]
                    [0, 0, 0, 0, 0]];

      game.makeMove(3, 1, B, false);
      assert.equal(game.board[1][1], constants.empty);
      assert.equal(game.board[1][2], constants.empty);
    });
  });
});

describe('Game of Size 9', function() {
    
    it('should not allow suicide on 9x9 board, single piece', function() {
		var game = newGame(9, false);
		var W = constants.white;
		var B = constants.black;
		//this is bad you should use constants instead of numbers
		game.board = [ [ 0, 0, 0, 0, 0, 0, 0, 0, 0 ],
                    [ 0, 0, 0, 0, 2, 0, 0, 0, 0 ],
                    [ 0, 1, 1, 2, 0, 2, 0, 0, 0 ],
                    [ 2, 1, 1, 1, 2, 0, 0, 0, 0 ],
                    [ 0, 0, 1, 2, 0, 0, 0, 0, 0 ],
                    [ 0, 0, 0, 0, 0, 0, 0, 0, 0 ],
                    [ 0, 0, 0, 0, 0, 0, 0, 0, 0 ],
                    [ 0, 0, 0, 0, 0, 0, 0, 0, 0 ],
                    [ 0, 0, 0, 0, 0, 0, 0, 0, 0 ] ];
      var exceptionThrown = false;
      try {
		game.turn = W;
		game.makeMove("pass", "pass", W, true);
        game.makeMove(4, 2, constants.black, false);
		//console.log (board);
      } catch (err) {
		  //console.log (err.message);
        if (err instanceof Rule.GameException) {
          exceptionThrown = true;
        }
      }
      assert(exceptionThrown);
      assert.equal(game.turn, constants.black);
	  });
 
     it('should not allow suicide on 9x9 board, 2 suicidal pieces', function() {
		var game = newGame(9, false);
		var W = constants.white;
		var B = constants.black;
		game.board = [[ 0, 0, 0, 0, 0, 0, 0, 0, 0 ],
                    [ 0, 0, 0, 0, 0, 0, 0, 0, 0 ],
                    [ 0, 0, 0, 0, 0, 0, 0, 0, 0 ],
                    [ 2, 2, 0, 0, 0, 0, 0, 0, 0 ],
                    [ 0, 0, 2, 2, 1, 0, 0, 0, 0 ],
                    [ 0, 2, 1, 0, 0, 0, 0, 0, 0 ],
                    [ 2, 2, 1, 0, 0, 0, 0, 0, 0 ],
                    [ 1, 0, 2, 1, 0, 0, 0, 0, 0 ],
                    [ 2, 2, 0, 0, 0, 0, 0, 0, 0 ] ];
     var ethrown = false;
     try {
		game.turn = W;
		game.makeMove("pass", "pass", W, true);
		game.makeMove(1, 7, constants.black, false);
     } catch (err) {
		 //console.log (err.message);
		if (err instanceof Rule.GameException) {
			ethrown = true;
        }
     }
     assert(ethrown)
     assert.equal(game.turn, constants.black);
    });
});

//should the deepEquals function from go.js be tested separately?
describe('Testing board deepCopy', function() {
    
    it('should copy 3x3 board of zeros', function() {
		
		var game = newGame(3, false);
		game.board =  [ [ 0, 0, 0 ],
						[ 0, 0, 0 ],
						[ 0, 0, 0 ] ];
		var boardCopy = JSON.parse(JSON.stringify(game.board));
		assert.equal(game.board.length, boardCopy.length);
		assert.equal(game.board[0].length, boardCopy[0].length);
		for(var i = 0; i< game.board.length; i++){
			for(var j = 0; j< game.board[0].length; j++){
				assert.equal(game.board[i][j], boardCopy[i][j]);
			}
		}
		assert.equal(JSON.stringify(game.board), JSON.stringify(boardCopy));
	});
		//why am I doing this
	it('should copy 3x3 board of mixed primitives', function() {
		var board =  [ [ 0, 1, -1 ],
					[ 1.5, '1', 'a' ],
					[ '', true, false ] ];
		var boardCopy = JSON.parse(JSON.stringify(board));
		assert.equal(board.length, boardCopy.length);
		assert.equal(board[0].length, boardCopy[0].length);
		for(var i = 0; j< board.length; i++){
			for(var j = 0; i< board[0].length; j++){
				assert.equal(board[i][j], boardCopy[i][j]);
			}
		}
        assert.equal(JSON.stringify(board), JSON.stringify(boardCopy));
	});
	
		//i dont even
		
	it('should copy mixed-length array of mixed primitives', function() {
		var board =  [ [ 0, 1, -1 ],
						[ 1.5], 
						['1', 'a', '', true, false ]];
		var boardCopy = JSON.parse(JSON.stringify(board));
		assert.equal(board.length, boardCopy.length);
		assert.equal(board[0].length, boardCopy[0].length);
		for(var i = 0; j< board.length; i++){
			for(var j = 0; i< board[0].length; j++){
				assert.equal(board[i][j], boardCopy[i][j]);
			}
		}
        assert.equal(JSON.stringify(board), JSON.stringify(boardCopy));
	});
 
	it('should copy 9x9 valid board', function() {
		var game = newGame(9, false);
		game.board = [ [ 0, 0, 0, 0, 0, 0, 0, 0, 0 ],
						[ 0, 0, 0, 0, 2, 0, 0, 0, 0 ],
						[ 0, 1, 1, 2, 0, 2, 0, 0, 0 ],
						[ 2, 1, 1, 1, 2, 0, 0, 0, 0 ],
						[ 0, 0, 1, 2, 0, 0, 0, 0, 0 ],
						[ 0, 0, 0, 0, 0, 0, 0, 0, 0 ],
						[ 0, 0, 0, 0, 0, 0, 0, 0, 0 ],
						[ 0, 0, 0, 0, 0, 0, 0, 0, 0 ],
						[ 0, 0, 0, 0, 0, 0, 0, 0, 0 ] ];
		var boardCopy = JSON.parse(JSON.stringify(game.board));
		assert.equal(game.board.length, boardCopy.length);
		assert.equal(game.board[0].length, boardCopy[0].length);
		for(var i = 0; i< game.board.length; i++){
			for(var j = 0; j< game.board[0].length; j++){
				assert.equal(game.board[i][j], boardCopy[i][j]);
			}
		}
		assert.equal(JSON.stringify(game.board), JSON.stringify(boardCopy));
	});
});
