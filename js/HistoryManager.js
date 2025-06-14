class HistoryManager {
  constructor(app) {
    this.app = app;
    this.undoStack = [];
    this.redoStack = [];
    this.MAX_HISTORY = 50;
  }

  saveState() {
    // Deep copy the state to prevent mutation issues
    const stateCopy = JSON.stringify(this.app.songData);

    // Don't save if state is identical to the last one
    if (
      this.undoStack.length > 0 &&
      this.undoStack[this.undoStack.length - 1] === stateCopy
    ) {
      return;
    }

    this.undoStack.push(stateCopy);
    this.redoStack = []; // Clear redo stack on new action

    if (this.undoStack.length > this.MAX_HISTORY) {
      this.undoStack.shift(); // Keep history size manageable
    }

    this.app.toolbar.render(); // Update undo/redo button states
  }

  undo() {
    if (this.undoStack.length <= 1) return; // Can't undo the initial state

    const currentState = this.undoStack.pop();
    this.redoStack.push(currentState);

    const previousState = this.undoStack[this.undoStack.length - 1];
    this.app.loadSongData(JSON.parse(previousState));
  }

  redo() {
    if (this.redoStack.length === 0) return;

    const nextState = this.redoStack.pop();
    this.undoStack.push(nextState);

    this.app.loadSongData(JSON.parse(nextState));
  }
}
