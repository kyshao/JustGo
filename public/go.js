// globals 
gameBoard = undefined;

// main
window.onload = function() {

    // create new game button and append it
    newGameButton = document.createElement('button');
    newGameButton.setAttribute("id", "newGameButton");
    $("body").append(newGameButton);
    $("#newGameButton").html("New Game");

    // clicking new game calls new game function
    $("#newGameButton").click(function() {
        $("#newGameButton").hide();
        $.post("/newGame", "Client wants new game", function(gameID, status) {
            if (status === "success" && gameID != undefined) {
                    console.log("Starting new game.");
                    newGame(gameID); // TODO: store gameID in cookie?
            }
        });
    });
}

/**
 * Create gameBoard
 */
function newGame(gameID) {
    canvas = document.createElement('canvas');
    $("body").append(canvas);

    gameBoard = new Board(9, 50, canvas, gameID);

    $("canvas").click(boardClicked);
    gameBoard.drawBoard();
}

/**
 * Called when gameBoard is clicked. Sends move to server then tells gameBoard to place piece
 */
function boardClicked(event) {
        var position = gameBoard.getIntersection(event.clientX, event.clientY);
        var move = {"x": position[0], "y": position[1], "sessionID": gameBoard.gameID};
        
        $.post("/makeClientMove", move, function(data) {    
            if (data == "Illegal Move") { // TODO: fix this to actually handle more errors
                window.alert("Illegal Move. Try again");
            }
            gameBoard.placePiece(data.x, data.y, data.color);

            if (data.capturedPieces) {
                gameBoard.removePieces(data.capturedPieces);
            }
        });
}
