function BeanAnimation(startRow, endRow, rowMoved, startColumn, endColumn, columnMoved, color){
    this.startRow = startRow;
    this.endRow = endRow;
    this.rowMoved = rowMoved;
    this.startColumn = startColumn;
    this.endColumn = endColumn;
    this.columnMoved = columnMoved;
    this.color = color;
}

class Model{
    constructor(rows, columns, nbTypes){
        this.rows = rows;
        this.columns = columns;
        this.nbTypes = nbTypes;
        this.score = 0;
        this.grid = [];
    }
    initGrid() {
        for (var i=0;i<this.columns;i++) {
            this.grid[i] = [];
            for (var j=0;j<this.rows;j++){
                this.generateBean(i, j)
            }
        }
    }
    generateBean(i, j){
        let beanType = Math.floor(Math.random() * this.nbTypes)
        this.grid[i][j] = beanType;
        return beanType;
    }
}

// state machine
// initiliazing, waitingForInput, waitingForAnimation...
class Controller{
    constructor(rows, columns, nbTypes, canvas){
        this.model = new Model(rows, columns, nbTypes);
        this.vue = new Vue(this.model, this, canvas);
        this.canvas = canvas;

        this.waitingForInput = false;
        this.selectedCell = "no cell selected";

        this.model.initGrid();
        this.vue.displayGrid(this.model.grid);

        this.updateGrid();
    }

    getInput(posX,posY){
        if(this.waitingForInput){
            let selectedRow = Math.floor(posX/this.vue.cellSize);
            let selectedColumn = Math.floor(posY/this.vue.cellSize);
            if (selectedRow < this.model.rows && selectedColumn < this.model.columns){
                let cell = [selectedRow, selectedColumn];
                if (this.selectedCell == "no cell selected"){
                    this.selectedCell = cell;
                    this.vue.drawHighlighted(cell[0], cell[1], this.vue);
                }
                else if(Math.abs(this.selectedCell[0] - cell[0]) == 1 && this.selectedCell[1] - cell[1] == 0 ||
                        Math.abs(this.selectedCell[1] - cell[1]) == 1 && this.selectedCell[0] - cell[0] == 0 ){
                    //swap values
                    let temp = this.model.grid[this.selectedCell[0]][this.selectedCell[1]];
                    this.model.grid[this.selectedCell[0]][this.selectedCell[1]] = this.model.grid[cell[0]][cell[1]];
                    this.model.grid[cell[0]][cell[1]] = temp;
                    if (!this.checkForAlignements().length){ //if no alignements are made, swap back
                        this.model.grid[cell[0]][cell[1]] = this.model.grid[this.selectedCell[0]][this.selectedCell[1]];
                        this.model.grid[this.selectedCell[0]][this.selectedCell[1]] = temp;
                        this.selectedCell = "no cell selected";
                    }
                    else { //play the animation
                        console.log("swaping cells");
                        let bean1 = new BeanAnimation(cell[1], this.selectedCell[1],0, cell[0], this.selectedCell[0], 0, this.model.grid[this.selectedCell[0]][this.selectedCell[1]]);
                        let bean2 = new BeanAnimation(this.selectedCell[1], cell[1],0, this.selectedCell[0], cell[0], 0, this.model.grid[cell[0]][cell[1]]);

                        let displayGrid = this.model.grid.slice(); // make a display copy with the two cells removed
                        displayGrid[cell[0]][cell[1]] = -1;
                        displayGrid[this.selectedCell[0]][this.selectedCell[1]] = -1;
                        
                        
                        this.selectedCell = "no cell selected";
                        this.waitingForInput = false;
                        setTimeout(this.vue.displayAnimation, 200, this.vue, displayGrid, [bean1, bean2]);
                    }
                }
                else { // if it wasnt an adjacent cell, move the selected cell
                    this.selectedCell[0] = cell[0];
                    this.selectedCell[1] = cell[1];
                    this.vue.drawHighlighted(cell[0], cell[1], this.vue);
                }
            }
        }
    }

    updateGrid(){
        var al = this.checkForAlignements();
        if (al.length == 0){
            console.log("you can input now!");
            this.waitingForInput = true;
        }
        else{
            this.destroyAlignements(al);
            this.fallDown();
        }
    }

    checkForAlignements(){
        var alignements = [];
        var aligned = 0;

        //check columns
        for(var i = 0; i<this.model.columns; i++){
            let lastColor = "null";
            let secondLastColor = "null";
            let isAlignement = false;
            for(var j = 0; j<this.model.rows; j++){
                let currentColor = this.model.grid[i][j];
                if(secondLastColor != "null"){
                    if(secondLastColor == lastColor && lastColor == currentColor){
                        if(!isAlignement){
                            alignements[aligned] = [i,j-2];
                            alignements[aligned+1] = [i,j-1];
                            alignements[aligned+2] = [i,j];
                            aligned += 3;
                        }
                        else{
                            alignements[aligned] = [i,j];
                            aligned += 1;
                        }
                        isAlignement = true;
                    }
                    else{
                        isAlignement = false;
                    }
                }
                secondLastColor = lastColor;
                lastColor = currentColor;
            }
        }
        
        //check rows
        for(var j = 0; j<this.model.rows; j++){
            let lastColor = "null";
            let secondLastColor = "null";
            let isAlignement = false;
            for(var i = 0; i<this.model.columns; i++){
                let currentColor = this.model.grid[i][j];
                if(secondLastColor != "null"){
                    if(secondLastColor == lastColor && lastColor == currentColor){
                        if(!isAlignement){
                            alignements[aligned] = [i-2,j];
                            alignements[aligned+1] = [i-1,j];
                            alignements[aligned+2] = [i,j];
                            aligned += 3;
                        }
                        else{
                            alignements[aligned] = [i,j];
                            aligned += 1;
                        }
                        isAlignement = true;
                    }
                    else{
                        isAlignement = false;
                    }
                }
                secondLastColor = lastColor;
                lastColor = currentColor;
            }
        }
        
        return alignements;
    }

    destroyAlignements(al){
        for (const cell of al){
            this.model.grid[cell[0]][cell[1]] = -1;
            this.model.score+=1;
        }
    }

    //rebuilds the grid by collapsing the holes and sending new animations
    fallDown(){
        let animationsBuffer = [];
        let displayGrid = []; //the grid shaved off to display animation on top
        for(var j=0; j<this.model.columns; j++){
            displayGrid.push([]);
            let fallingOn = this.model.rows-1;
            for(var i = this.model.rows-1; i >= 0; i--){

                displayGrid[j][i] = this.model.grid[j][i]

                if(this.model.grid[j][i] >= 0){
                    this.model.grid[j][fallingOn] = this.model.grid[j][i];
                    if (i != fallingOn){
                        animationsBuffer.push(new BeanAnimation(i, fallingOn,0, j, j, 0, this.model.grid[j][i])); //startRow, endRow, rowMoved, startColumn, endColumn, columnMoved, color
                        this.model.grid[j][i] = -1;
                        displayGrid[j][i] = -1; //ensures the correct display
                    }
                    fallingOn -= 1;
                }
            }
            //base on the value of fallingOn, repopulate the grid and add the new beans to the animationsBuffer
            for(var row = fallingOn; row>= 0; row--){
                let beanType = this.model.generateBean(j, row);
                animationsBuffer.push(new BeanAnimation(row-fallingOn-1, row, 0, j,j,0, beanType));
            }

        }
        setTimeout(this.vue.displayAnimation, 500, this.vue, displayGrid, animationsBuffer); 
    }
}

class Vue{ 
    constructor(model, controller, canvas){
        this.model = model;
        this.canvas = canvas;
        this.controller = controller;
        this.cellSize = Math.min(Math.floor(this.canvas.width/this.model.columns), Math.floor(this.canvas.height/this.model.rows))
        this.halfCellSize = Math.floor(this.cellSize/2);
    }

    //maybe clean up ordering of that between displayGrid and displayAnimation

    drawBean(x, y, color, that, movedX = 0, movedY = 0){
        that.canvas.beginPath();
        that.canvas.arc(y  * that.cellSize + that.halfCellSize + movedY, x * that.cellSize + that.halfCellSize + movedX, this.halfCellSize-2, 0, 2 * Math.PI);
        that.canvas.fillStyle = colors[color];
        that.canvas.fill();
    }

    drawHighlighted(x, y, that){
        that.displayGrid(that.model.grid, that);
        that.canvas.beginPath();
        that.canvas.rect(x*that.cellSize, y*that.cellSize, that.cellSize, that.cellSize);
        that.canvas.fillStyle = "rgba(125, 116, 115, 0.5)"
        that.canvas.fill();
    }


    displayGrid(grid, that){
        if (that == undefined)that = this;
        that.canvas.rect(0, 0, that.canvas.width, that.canvas.height);
        that.canvas.fillStyle="beige";
        that.canvas.fill();
        for (var i=0;i<that.model.rows;i++) {
            for (var j=0;j<that.model.columns;j++){
                let cellValue = grid[j][i];
                if (cellValue >= 0){
                    that.drawBean(i, j, cellValue, that);
                }
            }
        }
    }
    displayAnimation(that, grid, animationsBuffer){ 
        if (!Array.isArray(animationsBuffer) || !animationsBuffer.length){
            that.displayGrid(that.model.grid)
            that.controller.updateGrid();
        }
        else{
            that.displayGrid(grid);
            
            for (let i = animationsBuffer.length -1; i>=0; i--){
                let bAnim = animationsBuffer[i]; //each bean animation
                that.drawBean(bAnim.startRow, bAnim.startColumn, bAnim.color, that, bAnim.rowMoved, bAnim.columnMoved); // draw the bean
                // update the falling and switching
                
                // check for end of animation
                let currentRow = bAnim.startRow * that.cellSize + bAnim.rowMoved;
                let currentColumn = bAnim.startColumn * that.cellSize + bAnim.columnMoved;
                if( currentRow >= bAnim.endRow * that.cellSize && bAnim.startRow < bAnim.endRow ||
                    currentRow <= bAnim.endRow * that.cellSize && bAnim.startRow > bAnim.endRow ||
                    currentColumn >= bAnim.endColumn * that.cellSize && bAnim.startColumn < bAnim.endColumn ||
                    currentColumn <= bAnim.endColumn * that.cellSize && bAnim.startColumn > bAnim.endColumn)
                {
                    grid[bAnim.endColumn][bAnim.endRow] = bAnim.color;
                    animationsBuffer.splice(i, 1); // remove from buffer if it's arrived at destination
                }
                if (bAnim.startRow < bAnim.endRow)bAnim.rowMoved +=5;
                if (bAnim.startRow > bAnim.endRow)bAnim.rowMoved -=5;
                if (bAnim.startColumn < bAnim.endColumn) bAnim.columnMoved +=5;
                if (bAnim.startColumn > bAnim.endColumn) bAnim.columnMoved -=5;
            }
            setTimeout(that.displayAnimation, 10, that, grid, animationsBuffer); 
        }
    }

}

const colors = ["Green", "Red", "Blue", "Black", "Yellow",
                "Salmon", "Cyan", "Pink", "Orange", "Purple"];

function inputHandler(canvas, e, controller){
    let rect = canvas.getBoundingClientRect();
    let x = e.clientX - rect.left;
    let y = e.clientY - rect.top;
    controller.getInput(x, y);
}

function init(){
    var canvas = document.getElementById("viewport").getContext("2d");
    canvas.width = document.getElementById("viewport").width;
    canvas.height = document.getElementById("viewport").height;

    var controller = new Controller(8, 8, 4, canvas);

    document.getElementById("viewport").addEventListener('click', function(e) { 
        inputHandler(document.getElementById("viewport"), e, controller)});
}
