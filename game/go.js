"use strict";
const constants = require('./constants.js');

/**
 * Returned to client after a valid move. 
 * Contains information needed for view to update.
 */
class Move {
    constructor(x, y, color, capturedPieces, board, whiteScore, blackScore, pass) {
        this.x = x;
        this.y = y; 
        this.color = color;
        this.pass = false;
        this.capturedPieces = capturedPieces;
        this.board = board;
        this.whiteScore = whiteScore;
        this.blackScore = blackScore;
        this.pass = pass;
    }
}

/**
 * Provides a base exception class for Game 
 */
class GameException extends Error {
    constructor(message) {
        super(message);
        console.error("GameException: " + message);
    }
}

class DoublePassException extends GameException {
    constructor() {
        super("Two passes occured in a row. The game is over.");
    }
}

/**
 * Make move on a game
 * 
 * @param game is a "Game" object
 * @param xPos is the row of the move
 * @param yPos is the column of the move
 * @param color is either black or white 
 * @param pass is bool
 * 
 * @return is a Move object
 */
function makeMove(game, xPos, yPos, color, pass) {
    
	if (color != game.turn) {
		throw new GameException("Not your turn. " + " color = " + color + " game.turn = " + game.turn);  
    }
	
	var move = undefined;
	
    if (pass) {
        if (game.moveHistory.length > 0) {
            const lastMove = game.moveHistory[game.moveHistory.length - 1];
            if (lastMove.pass) {
                throw new DoublePassException();
            }
        }

		const scores = getScore(game);
		//    Move(x, y, color, capturedPieces, board, whiteScore, blackScore, pass)
        move = new Move(NaN, NaN, color, [], game.board, scores.whiteScore, scores.blackScore, true);

	}
	else{//no pass
		
		if (game.board[yPos][xPos] != constants.empty) {
			throw new GameException("Occupied Place.");
		}  
		//this statement executes before adding a piece
		var boardIsEmpty = isEmpty(game.board);
		
		game.board[yPos][xPos] = color;
		
		//basically an empty array
		//martin why don't you just use a normal array
		var capturedPieces = new Set();
		
		//below checks for: capturing, ko rule, suicide,
		if (!boardIsEmpty) {
			
			var visited = [];
			for (var i = 0; i < game.board.length; i++) {
				//initialize 2D array corresponding to board
				visited[i] = new Array(game.board.length).fill(false);
			}

			// For all tiles with pieces on board, find armies to calculate liberties
			// append to capturedPieces if an army has no liberties
			for (var i = 0; i < game.board.length; i++) {
				for (var j = 0; j < game.board.length; j++) {
					
					if (game.board[i][j] !== constants.empty && !visited[i][j]) { // there is a piece on this board "tile"  TODO: test auxillary matrix that stores if we've visited this piece so we don't have to do ever tile multiple times?     

						// perform depth first search to get armies connected to this piece
						var pieceColor = game.board[i][j];
						var army = new Set();
						//getArmy mutates army and visited
						getArmy(j, i, pieceColor, game.board, army, visited);
						//if no liberties schedule for deletion
						if(!armyHasLiberties(game.board, army)){
							army.forEach((element) => {
								capturedPieces.add(element);
							});
						}//end if
					}//end if
				}//end j
			}//end i
			
			//ko (repeated board) rule
			//this is done AFTER placing the player's piece and BEFORE removed captured
			//expects game.moveHistory to not be empty
			if(koRule(game,yPos,xPos,capturedPieces)){
				game.board[yPos][xPos] = constants.empty; // undo the board update
				throw new GameException("You cannot play a move which may lead to an infinite game");
			}
			
			
			//suicide case
			if (capturedPieces.has(point(xPos, yPos))) {
				
				
				game.board[yPos][xPos] = constants.empty; // undo the board update
				throw new GameException("You cannot commit suicide.");
			} 
		
			// remove captured pieces from board
			for (var pieceString of capturedPieces) {
				let piece = JSON.parse(pieceString); // convert to object since army and captured pieces are JSON strings
				game.board[piece.y][piece.x] = constants.empty;
			}	
		}
		
		const scores = getScore(game);
		//Move(x, y, color, capturedPieces, board, whiteScore, blackScore, pass)
		move = new Move(xPos, yPos, color, capturedPieces, game.board, scores.white, scores.black, false);
		
	}//end else
		
	// switch turn state to opposite color
	if (game.turn === constants.black) {
        game.turn = constants.white;
    } else {
        game.turn = constants.black;
    }

	game.moveHistory.push(move);
	return move;
		
}//end function makeMove
	
// JSON representation of a point. We use string addition here because 
// JSON.stringify seems inconsistent with adding quotation marks around the values (e.g. '{"foo":"3"}' vs '{"foo":3}' )
function point(x, y) {
	return '{"x":' + x + ',"y":' + y + '}';
}
	
// recursive depth-first search for armies
// mutates army and visited
function getArmy(x, y, color, board, army, visited) {  //called as getArmy(j,i,...)
	
	//check for out of bounds
	var inBounds = (x >= 0 && x < board.length && y >= 0 && y < board.length);

	//if next index is: not out of bounds; same color; not already in army
	if (inBounds && (board[y][x] === color) && !visited[y][x]) {//[y][x]???
		// Returns a JSON-string representation of a "point". 
		// Strings are used to create primitive values for points to allow lookup in Sets in constant time. [[not anymore]]
		army.add(point(x, y));
		visited[y][x] = true;
		
        // north??? y/x confusion
        getArmy(x, y+1, color, board, army, visited);
        // south
		getArmy(x, y-1, color, board, army, visited);
		// east
		getArmy(x+1, y, color, board, army, visited);
		// west
		getArmy(x-1, y, color, board, army, visited);
	}//end if
}//end function
		
//does not mutate board or army
function armyHasLiberties(board, army){
	//var liberties = 0;//unused
	for (var node of army) {
		node = JSON.parse(node); // convert back to object since army is composed of JSON strings 
		var x = node.x;
		var y = node.y;

		//bools
		//JS arrays behave weirdly
		//array.length returns max index + 1, regardless of gaps in the array
		//negative array indexes can be defined and do not affect array.length
		var rightLiberty = (x + 1 < board.length) &&(board[y][x + 1] === constants.empty);
		var leftLiberty  = (x - 1 >= 0) 		&&	(board[y][x - 1] === constants.empty);
		var northLiberty = (y + 1 < board.length) &&(board[y + 1][x] === constants.empty);
		var southLiberty = (y - 1 >= 0) 		&&	(board[y - 1][x] === constants.empty);
	
		if (rightLiberty || leftLiberty || northLiberty || southLiberty) {
			return true;
		}
	}//end for
	return false;		
}//end function
	
	
//these 3 functions should be put in a Board class but such a class doesnt exist yet
/**
*function deepCopy
*input reference to a board object
*returns a copy of the board
*should work with any 2D array
*/
function deepCopy(board){
	var boardCopy = new Array(board.length);
	for (var i = 0; i < board.length; i++) {
		boardCopy[i] = new Array(board[i].length);
		for (var j = 0; j < board[i].length; j++) {
				boardCopy[i][j] = board[i][j];
		}
	}
	return boardCopy;
}

function deepEquals(board1, board2){
	if(board1.length !== board2.length) return false;
	if(board1[0].length !== board2[0].length) return false;
	
	for(var i = 0; i< board1.length; i++){
		for(var j = 0; j< board1[0].length; j++){
			if(board1[i][j] !== board2[i][j]) return false;
		}
	}
	return true;
}

/**
*function isEmpty
*input reference to a board object
*returns true if every cell is equal to 0
*/
function isEmpty(board){
	for (var i = 0; i < board.length; i++) {
		for (var j = 0; j < board[i].length; j++) {
				if(board[i][j] !== 0)	return false;
		}
	}return true;
}

//this is done AFTER placing the player's piece and BEFORE removed captured
//should mutate nothing
function koRule(game,yPos,xPos,capturedPieces){
	//if move history does not exist
	if(game.moveHistory!==game.moveHistory || game.moveHistory.length === 0){
		throw new Error("Error at koRule: game.moveHistory does not exist. If this error is encountered while running test cases, make sure that hard-coded board arrangements have at least one item in moveHistory (even a pass should work)");
	}
	
	var newBoard = deepCopy(game.board);
		//capture
		for (var pieceString of capturedPieces) {
			let piece = JSON.parse(pieceString); // convert to object since army and captured pieces are JSON strings
			newBoard[piece.y][piece.x] = constants.empty;
		}
	
	var previousBoard = deepCopy(game.board);
		//undo current move
		previousBoard[yPos][xPos] = constants.empty;
		
		//undo 1 move from opposing player
		var prevMove = game.moveHistory[game.moveHistory.length-1];
		if(!prevMove.pass){
			//unmove
			previousBoard[prevMove.y][prevMove.x] = constants.empty;
			//behaviour of this statement relies on prevMove color being only white or black, not empty
			var colorOfPrevCapturedPieces = ((prevMove.color === constants.white) ? constants.black : constants.white);
			//uncapture
			for (var pieceString of prevMove.capturedPieces) {
				let piece = JSON.parse(pieceString); // convert to object since army and captured pieces are JSON strings
				previousBoard[piece.y][piece.x] = colorOfPrevCapturedPieces;
			}
		}
		
	return deepEquals(newBoard,previousBoard);
	
}
	
function getScore(game) {
    
    var blackScore = 0;
    var whiteScore = 0;
    var influence = [];
    for (var i = 0; i < game.board.length; i++) {
        influence[i] = new Array(game.board.length).fill(0);
    }
    
    for (var i = 0; i < game.board.length; i++) {
        for (var j = 0; j < game.board.length; j++) {
            if (game.board[i][j] == constants.black) {
                createBlackInfluence(i, j);    
            } 
            if (game.board[i][j] == constants.white) {
                createWhiteInfluence(i, j);
            }
        }
    }

    for (var i = 0; i < influence.length; i++) {
        for (var j = 0; j < influence.length; j++) {
            if (influence[i][j] > 0) {
                blackScore++;
            } else if (influence[i][j] < 0) {
                whiteScore++;
            }
        }
    }

    function createBlackInfluence(i, j) {
        for (var y = 0; y < influence.length; y++) {
            for (var x = 0; x < influence.length; x++) {
                influence[y][x] += Math.round(game.board.length - Math.sqrt((x-i)*(x-i) + (y-i)*(y-i)));
            }
        }
    }

    function createWhiteInfluence(i, j) {
        for (var y = 0; y < influence.length; y++) {
            for (var x = 0; x < influence.length; x++) {
                influence[y][x] += Math.round(-game.board.length + Math.sqrt((x-i)*(x-i) + (y-i)*(y-i)));
            }
        }
    }
    
    return { white: whiteScore, black: blackScore };
}

/**
 * "Ends"" a game document. 
 *  Returns { winner: winner, scores: { black: int, white: int } }
 */
function endGame(game) {

    game.active = false;
    var scores = getScore(game);
    var winner = scores.white > scores.black ? constants.white : constants.black;

    return { winner: winner, scores: scores };
}


/**
 * This module's "public interface"
 */
module.exports = {
    makeMove: makeMove,
    GameException: GameException,
    DoublePassException: DoublePassException,
    getScore: getScore,
    endGame: endGame,
	
	//these shouldnt technically be public
	getArmy:getArmy,
	armyHasLiberties:armyHasLiberties,
	deepCopy:deepCopy,
	deepEquals:deepEquals
};
