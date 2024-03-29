console.log("-- Reversi --");
console.log("@author Saeed Nejati");

/*** Data structures ***/

var X = 1;
var O = -1;
var INF = 2000000000;
var thinkingDepth;

var delay = 500;             // The delay in miliseconds after each AI move

var map;                     // Internal state of the board
var cnt = {[X]: 0, [O]: 0};  // Running count of xs and os on the board

var currentPlayer;
var playerType = {[X] : "Human", [O] : "Human"};
var aiLevels = {"easy": 1, "medium": 2, "hard": 4};

var playerColor = {[X]: "Black", [O]: "Red"};

var stateCount;

/*** Util functions ***/

function inRange(x, y) {
    return (x >= 0 && x < 8 && y >= 0 && y < 8);
}

/** Checks if a player can put his peg on cell (x, y) */
function valid(x, y, player) {
    if ( !inRange(x, y) ) return false;
    if ( map[x][y] ) return false;

    for( var dx=-1; dx<=1; dx++ )
        for( var dy=-1; dy<=1; dy++ ) {
            var opponent = 0, self = false;
            for( var i=x+dx,j=y+dy; inRange(i, j); i+=dx,j+=dy ) {
                if ( map[i][j] == 0 ) break;
                if ( map[i][j] == player ) { self = true; break; }
                else opponent++;
            }
            if ( self && opponent > 0 ) return true;
        }
    return false;
}

/** Checks if a player has any valid moves on the board */
function hasValidMove(player) {
    if ( cnt[X] == 0 || cnt[O] == 0 ) // one of the player doesn't have any pegs left!
        return false;
    if ( cnt[X] + cnt[O] == 64 ) // there are no empty cells
        return false;

    for( var i=0; i<8; i++ )
        for( var j=0; j<8; j++ )
            if ( map[i][j] == 0 && valid(i, j, player) )
                return true;
    return false;
}

/** Performs a move for a player by putting
 * a peg on cell (x, y) and flipping necessary pegs
 *
 * - Only updates the internal map
 * - The move should be valid
 */
function move(x, y, player) {
    map[x][y] = player;

    cnt[player]++;
    for( var dx=-1; dx<=1; dx++ )
        for( var dy=-1; dy<=1; dy++ ) {
            var opponent = 0, self = false;
            var i, j;
            for( i=x+dx,j=y+dy; inRange(i, j); i+=dx,j+=dy ) {
                if ( map[i][j] == 0 ) break;
                if ( map[i][j] == player ) { self = true; break; }
                else opponent++;
            }
            if ( self && opponent > 0 )
                for( var I=x+dx,J=y+dy; I!=i || J!=j; I+=dx,J+=dy )
                {
                    map[I][J] = player;
                    cnt[X] += player;
                    cnt[O] -= player;
                }
        }
}

/** Puts a peg at the given position on board
 *
 * - Updates the internal map and the UI board
 */
function put(i, j, peg) {
    map[i][j] = peg;
    $("#c" + i + "-" + j)
    .removeClass("empty")
    .removeClass("red")
    .removeClass("black")
    .addClass(function(){return peg == X ? "black" : "red"});
}

/** Redraws pegs on the UI board */
function updateBoard() {
    for( var i=0; i<8; i++ )
        for( var j=0; j<8; j++ )
            if ( map[i][j] ) put(i, j, map[i][j]);
}

/** Checks if any player has won the game
 * @return 1   if X is winner
 *         -1  if O is winner
 *         0   if Draw
 *         INF if not finished
 */
function winner() {
    if ( !hasValidMove(X) && !hasValidMove(O) ) // if one of the players has a valid move, the game is not finished
        return (cnt[X] > cnt[O] ? X : cnt[X] < cnt[O] ? O : 0);
    return INF;
 }

/** Calculates the score of a board for a player
 *  (leaf node) */
function score(player) {
    var weight = [
        [ 5,  2,  2,  2,  2,  2,  2,  5],
        [ 2, -1, -1, -1, -1, -1, -1,  2],
        [ 2, -1,  1,  1,  1,  1, -1,  2],
        [ 2, -1,  1,  1,  1,  1, -1,  2],
        [ 2, -1,  1,  1,  1,  1, -1,  2],
        [ 2, -1,  1,  1,  1,  1, -1,  2],
        [ 2, -1, -1, -1, -1, -1, -1,  2],
        [ 5,  2,  2,  2,  2,  2,  2,  5],
    ];

    weight[1][1] = weight[1][0] = weight[0][1] = (map[0][0] == player) ? 2 : -1;
    weight[1][6] = weight[1][7] = weight[0][6] = (map[0][7] == player) ? 2 : -1;
    weight[6][1] = weight[7][1] = weight[6][0] = (map[7][0] == player) ? 2 : -1;
    weight[6][6] = weight[7][6] = weight[6][7] = (map[7][7] == player) ? 2 : -1;

    var s = 0;
    for( var i=0; i<8; i++ )
        for( var j=0; j<8; j++ )
            s += (map[i][j] == player ? 1 : map[i][j] == -player ? -1 : 0) * weight[i][j];

    return s;
}

/** The main alpha-beta search function */
function value(player, depth, alpha, beta, maxPlayer) {
    var w = winner();
    if ( w != INF ) {
        var val = (w == 0 ? 0 : w == maxPlayer ? INF : -INF);
        return {x: -1, y: -1, v: val};
    }

    if ( depth == 0 ) return {x: -1, y: -1, v: score(maxPlayer)};

    stateCount++;
    var cut = false;
    var xx = -1, yy = -1;
    var tmp, tmpxcnt, tmpocnt;
    var notmoved = true;

    for( var i=0; i<8 && !cut; i++ )
        for( var j=0; j<8 && !cut; j++ ) {
            if ( !valid(i, j, player) ) continue;
            if ( xx == -1 ) { xx = i; yy = j; }

            tmp = $.extend(true, [], map);
            tmpxcnt = cnt[X];
            tmpocnt = cnt[O];

            move(i, j, player);
            notmoved = false;
            var r = value(-player, depth-1, alpha, beta, maxPlayer);

            map = $.extend(true, [], tmp);
            cnt[X] = tmpxcnt;
            cnt[O] = tmpocnt;

            if ( player == maxPlayer ) {
                if ( r.v > alpha ) {
                    alpha = r.v;
                    xx = i;
                    yy = j;
                }
            }
            else {
                if ( r.v < beta )
                    beta = r.v;
            }

            if ( beta <= alpha )
                cut = true;
        }

    if ( notmoved ) {
        tmp = $.extend(true, [], map);
        tmpxcnt = cnt[X];
        tmpocnt = cnt[O];

        var r = value(-player, depth-1, alpha, beta, maxPlayer);

        map = $.extend(true, [], tmp);
        cnt[X] = tmpxcnt;
        cnt[O] = tmpocnt;

        if ( player == maxPlayer ) {
            if ( r.v > alpha ) alpha = r.v;
        }
        else {
            if ( r.v < beta ) beta = r.v;
        }
    }

    if ( player == maxPlayer ) {
        return {x: xx, y: yy, v: alpha};
    }

    return {x: xx, y: yy, v: beta};
}


/*** Main structure ***/

function init() {
    var board = $("#board");
    var txt = "";
    map = [];
    for( var i=0; i<8; i++ ) {
        txt += "<tr>";
        map[i] = [];
        for( var j=0; j<8; j++ ) {
            txt += "<td><div id='c"+i+"-"+j+"' class='peg empty'></div></td>";
            map[i][j] = 0;
        }
        txt += "</tr>";
    }
    board.html(txt);

    put(3, 3, O);
    put(3, 4, X);
    put(4, 3, X);
    put(4, 4, O);

    cnt[X] = cnt[O] = 2;

    currentPlayer = X;
    stateCount = 0;
    if ( playerType[X] == "Human" || playerType[O] == "Human" )
        $("td").click(moveUser);
    $("#result").html("");
    updateScore();
}

function setupHandlers() {
    $("#newgame").click(function(){
        playerType[X] = $("#blackplayer").find(":selected").val();
        playerType[O] = $("#redplayer").find(":selected").val();
        var level = $("#ailevel").find(":selected").val();
        thinkingDepth = aiLevels[level];
        console.log(playerType);
        console.log("Thinking Depth: " + thinkingDepth);
        init();
        run();
    });
}

function moveUser() {
    var clickedCellID = $(this).find("div").attr("id");
    var x = parseInt(clickedCellID[1]);
    var y = parseInt(clickedCellID[3]);
    if ( valid(x, y, currentPlayer) ) {
        move(x, y, currentPlayer);
        next();
    }
    else {
        console.log("("+x+","+y+") is not a valid move for "
            + (currentPlayer == X ? "black" : "red"));
    }
}

function moveAI() {
    stateCount = 0;
    var m = value(currentPlayer, thinkingDepth, -INF, INF, currentPlayer);
    move(m.x, m.y, currentPlayer);
    console.log("Number of processed states: " + stateCount);
    next();
}

function next(flag) {
    if ( !(flag == true) ) $("#info").html("");
    updateBoard();
    updateScore();
    clearPossibleMoves();
    currentPlayer = -currentPlayer;
    setTimeout(run, 1);
}

function updateScore() {
    $("#score").html("Score: " + playerColor[X] + ": " + cnt[X] + ", " + playerColor[O] + ": " + cnt[O]);
}

function showPossibleMoves() {
    var i, j;
    for( i=0; i<8; i++ )
        for( j=0; j<8; j++ ) {
            if ( valid(i, j, currentPlayer) ) {
                $("#c" + i + "-" + j)
                    .parent()
                    .removeClass("unselected")
                    .addClass("selected");
            }
        }
}

function clearPossibleMoves() {
    var i, j;
    for( i=0; i<8; i++ )
        for( j=0; j<8; j++ ) {
            $("#c" + i + "-" + j)
                .parent()
                .removeClass("selected")
                .addClass("unselected");
        }
}

function run() {
    var w = winner();
    if ( w == X || w == O )
        $("#result").html(playerColor[w] + " has won!");
    else if ( w == 0 )
        $("#result").html("It is a tie!");
    else if ( !hasValidMove(currentPlayer) ) {
        $("#info").html("Info: " + playerColor[currentPlayer] + " has no valid moves. It's " + playerColor[-currentPlayer] + "'s turn.");
        next(true);
    }
    else {
        if ( playerType[currentPlayer] == "AI" )
            setTimeout(moveAI, delay);
        else
            showPossibleMoves();
    }
}

init();
setupHandlers();
run();

