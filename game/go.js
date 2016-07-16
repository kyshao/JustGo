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
class GameException {
    constructor(message) {
        console.error("GameException: " + message);
        this.message = message;
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
    
    if (pass) {

        // switch turn state to opposite color
        if (game.turn == constants.black) {
            game.turn = constants.white;
        } else {
            game.turn = constants.black;
        } 

        if (game.moveHistory.length > 0) {
            const lastMove = game.moveHistory[game.moveHistory.length - 1];
            if (lastMove.pass) {
                throw new DoublePassException();
            }
        }

        const scores = getScore(game);
        const move = new Move(NaN, NaN, color, [], game.board, scores.whiteScore, scores.blackScore, true)

        game.moveHistory.push(move);

        return move;
    }

    if (game.board[yPos][xPos] != constants.empty) {
        throw new GameException("Occupied Place.");
    }  
    if (color != game.turn) {
        throw new GameException("Not your turn. " + " color = " + color + " game.turn = " + game.turn);  
    }

    game.board[yPos][xPos] = color;  // update the board 

    var visited = [];
    for (var i = 0; i < game.board.length; i++) {
        visited[i] = new Array(game.board.length).fill(false);
    }

    // For all tiles with pieces on board, find armies to calculate liberties
    // append to capturedPieces if an army has no liberties
    var capturedPieces = new Set();
    for (var i = 0; i < game.board.length; i++) {
        for (var j = 0; j < game.board.length; j++) {
                
            if (game.board[i][j] != constants.empty && !visited[i][j]) { // there is a piece on this board "tile"  TODO: test auxillary matrix that stores if we've visited this piece so we don't have to do ever tile multiple times?     
                                
                // perform depth first search to get armies connected to this piece
                var army = new Set();       
                var pieceColor = game.board[i][j];

                // recursive depth-first search for armies
                (function getArmies(x, y, color) {              
                    if (x < 0 || x >= game.board.length || y < 0 || y >= game.board.length) { // out of bounds
                        return;
                    }

                     // Returns a JSON-string representation of a "point". 
                     // Strings are used to create primitive values for points to allow lookup in Sets in constant time. 

                    army.add(point(x, y));
                    visited[i][j] = true;
                    
                    if (y+1 < game.board.length && game.board[y+1][x] == color && !army.has(point(x, y+1))) {
                        // north neighbor is piece of same color and we haven't added it to the army yet
                        getArmies(x, y+1, color);
                    }
                    if (y-1 >= 0 && game.board[y-1][x] == color && !army.has(point(x, y-1))) {
                        // south neighbor is piece of same color and we haven't added it to the army yet
                        getArmies(x, y-1, color);
                    } 
                    if (x+1 < game.board.length && game.board[y][x+1] == color && !army.has(point(x+1, y))) {
                        // west neighbor is piece of same color and we haven't added it to army yet
                        getArmies(x+1, y, color);
                    }
                    if (x-1 >= 0 && game.board[y][x-1] == color && !army.has(point(x-1, y))) {
                        // south neighbor is piece of same color and we haven't added it to army yet
                        getArmies(x-1, y, color);
                    }   
                    
                })(j, i, pieceColor);

                // calculate army's liberties                
                var liberties = 0;
                for (var node of army) {
                    node = JSON.parse(node); // convert back to object since army is composed of JSON strings 
                    var x = node.x;
                    var y = node.y;

                    var rightLiberty = x + 1 < game.board.length && game.board[y][x + 1] == constants.empty;
                    var leftLiberty = x - 1 >= 0 && game.board[y][x - 1] == constants.empty;
                    var northLiberty = y + 1 < game.board.length && game.board[y + 1][x] == constants.empty;
                    var southLiberty = y - 1 >= 0 && game.board[y - 1][x] == constants.empty;
                    
                    if (rightLiberty || leftLiberty || northLiberty || southLiberty) {
                        liberties++;
                    }
                } 

                // army is captured if it has no liberties
                if (liberties == 0) {
                    army.forEach((element) => {
                        capturedPieces.add(element);
                    });
                }

            }
        }
    }
    
    if (capturedPieces.has(point(xPos, yPos))) {
        game.board[yPos][xPos] = constants.empty; // undo the board update
        throw new GameException("You cannot commit suicide.");
    } 

    // switch turn state to opposite color
    if (game.turn == constants.black) {
        game.turn = constants.white;
    } else {
        game.turn = constants.black;
    }

    // remove captured pieces from board
    for (var piece of capturedPieces) {
        piece = JSON.parse(piece); // convert to object since army and captured pieces are JSON strings
        game.board[piece.y][piece.x] = constants.empty;
    }

    const scores = getScore(game);
    const move = new Move(xPos, yPos, color, capturedPieces, game.board, scores.white, scores.black, false);
    game.moveHistory.push(move);
    
    return move;

    // JSON representation of a point. We use string addition here because 
    // JSON.stringify seems inconsistent with adding quotation marks around the values (e.g. '{"foo":"3"}' vs '{"foo":3}' )
    function point(x, y) {
        return '{"x":' + x + ',"y":' + y + '}';
    }
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
    endGame: endGame
};
