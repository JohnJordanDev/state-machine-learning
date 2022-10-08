/** 
 * Notes
 * 1. Difference between 'jump' (using statePath; doesn't trigger entry/exit actions)
 *  and 'transition' (transition state; does trigger entry/exit actions)
 * 2. When adding a new state (atomic or nested), need to add to validState list
 */
try {
    const stateMachineFactory = (function () {
        const Factory = function(stateMachineDescription) {
            let _pseudoStates = [];
            let _state = stateMachineDescription['states'][stateMachineDescription.initial];
            let _statePath = stateMachineDescription.initial;
            const m = {
                __proto__: Factory.prototype,
                get pseudoStates() {return this._pseudoStates},
                set pseudoStates(newState) {
                    if(!Array.isArray(newState)) return this.disallowedAction('Pseudostate must be array');
                    this._pseudoStates = newState;
                },
                get state() {return _state;},
                set state(newState) {return this.disallowedAction(`Trying to set manually, to '${newState}'`)},
                get statePath() {return _statePath;},
                set statePath(newPath) {
                    if(!this.isValidPath(newPath)) return;
                    _statePath = newPath;
                    _state = this.getStateFrameFromPath(_statePath);
                    console.info('State has changed...', [this.state, this.statePath]);
                },
                ...stateMachineDescription,
                //TODO: this could be replaced with an actual check on the state machine, to see if path corresponds to a state
                validStates: Object.keys(stateMachineDescription['states'])
                    .concat([
                    'loaded.twoTerm', 
                    'loaded.multiTerm', 
                    'loaded.error', 
                    'loaded.twoTerm.multitude', 
                    'loaded.twoTerm.magnitude',
                    'loaded.multiTerm.multitude',
                    'loaded.multiTerm.magnitude',
                    'woof.-majorTerm-minorTerm'
                ])
            };
            return m;
        };
        Factory.prototype.disallowedAction = function(msg) {
            console.warn('This action is not allowed: ', msg);
            return null;
        };
        /**
         * 
         * @param {object} state state undergoing transition event
         * @param {string} actionList name of property on state, which lists functions 
         */
        Factory.prototype.doStateTransitionActions = function(state, actionListName = 'onExit') {
            //this.disallowedAction('action list NOT on state.');
            if(!(state[actionListName] && Array.isArray(state[actionListName]))) return;
            let list = state[actionListName];
            for(let i = 0; i < list.length; i++) {
                list[i](`'${actionListName}' actions being called on '${this.statePath}' state.`);
            }
        };

        /**
         * @param {string} event name of event sent to state machine
         */
        Factory.prototype.getPathToAncestorStateWithAction = function(event) {
            if(!event) return console.warn('"Event" cannot be empty, when finding ancestor with action!');
            let pathList = this.statePath.split('.');
            pathList.pop(); // get parent path
            let ancestorState = this.getStateFrameFromPath(pathList.join('.'));
            while("rootState" !== ancestorState.label && pathList.length) {
                const validActionsOnParent = ancestorState.on;
                if(validActionsOnParent && validActionsOnParent[event]) {
                    return pathList.join('.');
                }
                pathList.pop();
                ancestorState = this.getStateFrameFromPath(pathList.join('.'));
            };
            return pathList.join('.');
        };

        Factory.prototype.getChildPathsRelativeToAncestor = function(ancestorLabel = ''){  
            const curr = this.statePath.split('.'); 
            const ancesList = ancestorLabel.split('.');
            return curr.filter((e, i) => {
                return i >= ancesList.length; 
            });
        },
    
        Factory.prototype.getDeepestStateLabel = function() {
            return this.statePath.split('.').pop();
        };
        Factory.prototype.getParentOfCurrentGlobalState = function() {
            let listOfNestedStates = this.statePath.split('.');
              if(1 === listOfNestedStates.length)  return this;   // returning state machine itself
            listOfNestedStates.pop(); // get parent state path
            return this.getStateFrameFromPath(listOfNestedStates.join('.'));
        };
        Factory.prototype.getStateFrameFromPath = function(path = this.statePath) {
            // assume at root state, return state machine itself
            if(!path) return this;

            //TODO: Check for parallel states
            if(-1 < this.getDeepestStateLabel().indexOf('-')) {
                let newStateFrame = {};
                let parallelStatesFrames = this.state && this.state.states;
                let parallelStateList = Object.keys(parallelStatesFrames);
                let parallelStateLabels = this.getDeepestStateLabel().slice(1).split('-');
                let currentParallelState;
                for(let i = 0; i < parallelStateList.length; i++) {
                    currentParallelState = parallelStateLabels[i]; 
                    newStateFrame[currentParallelState] = parallelStatesFrames[currentParallelState];
                }
                //return console.log('setting parallel states from getStateFrameFromPath ', this.state, parallelStateLabels);
                return newStateFrame;
            }
            
            const statePathList = path.split('.');

            // first child state of state machine, itself           
            let currentStateFrame = this.states[statePathList[0]];
            if(!currentStateFrame) {
                return console.warn('Given path does not match child states of state machine (itself)');
            }

            if(1 === statePathList.length) return currentStateFrame;

            for(let i = 1; i <= statePathList.length - 1; i++){
                if(!currentStateFrame.states) {
                    return console.warn('Tried to find nested states in atomic state');
                }
                if(currentStateFrame.states && currentStateFrame.states[statePathList[i]]) {
                    currentStateFrame = currentStateFrame.states[statePathList[i]];
                } else {
                    return console.warn('Nested state does not exist on this compound state');
                }
            }
            return currentStateFrame;
        };
        Factory.prototype.getValidChildStates = function() {
            const p = this.statePath + '.';
            return this.validStates.filter(s => s.indexOf(p) >= 0);
        };
        Factory.prototype.isFirstStateInPath = function(states = [], parPath = this.getValidChildStates()) {
            const firstState = states[0];
            for(let i = 0; i < parPath.length; i++) {
                if(-1 < parPath[i].indexOf(firstState)){
                    return true;
                }
            }
            return false;
        };
        Factory.prototype.isValidPath = function(newPath) {
            const pathExists = this.validStates.filter(path => path === newPath).length === 1;
            if(pathExists) return pathExists;
            console.error('newpath is NOT on list: ', newPath);
            throw new Error('new state path not on validState list: ');
        };
        Factory.prototype.sendEvent = function(event) {
            console.warn('Event: ', event);
            const currentState = this.state;
            if(currentState.type && 'final' === currentState.type) return;

            const validActions = currentState.on;
            if(!validActions) return console.warn('Present state has no actions "on" property');

            const actionBeingTaken = validActions[event];
            const targetStateLabel = actionBeingTaken && actionBeingTaken.target;
            if(targetStateLabel) {
                this.transitionToNewSiblingState(targetStateLabel);
            }  

            if(!actionBeingTaken) {
                const pathToAncestorWithAction = this.getPathToAncestorStateWithAction(event);
                if(pathToAncestorWithAction) {
                    // Note: difference here between 'jump' and 'transition' (entry/exit actions triggered) to states
                    // TODO: refactor this to use 'updateStatePath', and indicate a parent
                    console.warn('directly jumping ', pathToAncestorWithAction);
                    this.updateStatePath(pathToAncestorWithAction, {directToAncestor: true});

                    const validActions = this.state.on;
                    const actionBeingTaken = validActions[event];
                    const targetStateLabel = actionBeingTaken && actionBeingTaken.target;
                    if(targetStateLabel) {
                        this.transitionToNewSiblingState(targetStateLabel);
                    }
                }
            }
            
        };
        /**
         * Move machine from current to new state, based on allowed and present action from current state
         * @param {string} targetStateLabel - name of sibling state to transition to
         * 
         */
        Factory.prototype.transitionToNewSiblingState = function(targetStateLabel) {
           if(!targetStateLabel) return;
            const parentState = this.getParentOfCurrentGlobalState();
            const siblingStates = parentState && parentState.states; 
            // check if safe to make transition
            if(!(siblingStates && siblingStates[targetStateLabel])) return;

            this.updateStatePath(targetStateLabel);

            if(this.state && 'parallel' === this.state.type) {
                if(!this.state.states) return this.disallowedAction(`Parallel state has no 'states' property`);
                let parallelStates = Object.keys(this.state.states).join('-');
                parallelStates = '-' + parallelStates;

                console.error('parallel state being entered: ', this.state.label, parallelStates);
                return this.updateStatePath(parallelStates, {parallel: true});
            }

            while(this.state.initial) {
                // default to initial state for this state being entered
                let nextState = this.state.initial;

                console.log(this.isFirstStateInPath(this.pseudoStates));

                // if next pseudo state valid, take it
                if(this.pseudoStates && this.pseudoStates[0] && this.state.states[this.pseudoStates[0]]) {
                    console.log('valid pseudo state exists...');
                    nextState = this.pseudoStates.shift();
                } else {
                     // if pseudo[0] is still valid child somewhere in valid children, keep
                    // else, shift off pseudo[0]
                    if(this.pseudoStates && !this.isFirstStateInPath(this.pseudoStates)) this.pseudoStates.shift();

                }
                this.updateStatePath(nextState, {nested: true});
            }
        };
        /**
         * Updates the machine's state path, based on various parameters
         * @param {string} target new state to append/set, depending on config
         * @param {object} config 
         * @returns 
         */
        Factory.prototype.updateStatePath = function(target, 
                    config = {nested: false, directToAncestor: false, parallel: false}
                ) {
                    const {nested, directToAncestor, parallel} = config;
                    const listOfStates = this.statePath.split('.');

                    if(parallel) {
                        return  this.statePath += '.' + target;
                    }
                    if(directToAncestor) {
                        //TODO: Check and store pseudo child states
                        this.pseudoStates = this.getChildPathsRelativeToAncestor(target);
                        console.warn('pseduoL ', this.pseudoStates);
                        return this.statePath = target;
                    }
                    if(!nested) {
                        this.doStateTransitionActions(this.state, 'onExit');
                    }
                    if(1 == listOfStates.length && !nested) {
                        this.statePath = target;
                    } else if(nested) {

                        this.statePath += '.' + target;
                    } else {
                        listOfStates[listOfStates.length -1] = target;
                        this.statePath = listOfStates.join('.');
                    }
                    return this.doStateTransitionActions(this.state, 'onEntry');    
                };
        return Factory;
    }());

    const typeStates = {
        initial: 'multitude',
        states: {
            multitude: {
                on: {
                    SWITCH_MAGNITUDE: {
                        target: 'magnitude'
                    }
                }
            },
            magnitude: {
                on: {
                    SWITCH_MULTITUDE: {
                        target: 'multitude'
                    } 
                }
            }
        }
    };

    const loadedStates = {
        initial: 'twoTerm',
        states: {
            twoTerm: {
                label: 'twoTerm',
                initial: 'multitude',
                on: {
                    SELECT_TWOTERM: {
                        target: null
                    },
                    SELECT_MULTITERM: {
                        target: 'multiTerm'
                    },
                    ERROR: {
                        target: 'error'
                    }
                },
                ...typeStates
            },
            multiTerm: {
                label: 'multiTerm',
                initial: 'multitude',
                on: {
                    SELECT_TWOTERM: {
                        target: 'twoTerm'
                    },
                    ERROR: {
                        target: 'error'
                    }
                },
                ...typeStates
            },
            error: {
                label: 'loaded.error',
                onEntry: [console.log],
                onExit: [console.log],
                type: 'final',
            }
        } 
    };

    const widgetDescription = {
        initial: 'loading',
        label: 'rootState',
        states: {
            loading: {
                label: 'loading',
                on: {
                    LOAD: {
                        target: 'loaded'
                        // could add guard conditions here, and check in blueprint: https://jonbellah.com/articles/intro-state-machines
                    },
                    ERROR: {
                        target: 'error'
                    },
                    WOOF: {
                        target: 'woof'
                    }
                }
            },
            loaded: {
                label: 'loaded',
                onEntry : [console.log],
                onExit : [console.log],
                on: {
                    ERROR: {
                        target: 'error'
                    },
                    SPOOF: {
                        target: 'spoof'
                    },
                    WOOF: {
                        target: 'woof'
                    }
                },
                ...loadedStates
            },
            error: {
                label: 'error',
                onEntry : [console.log],
                onExit : [console.log],
                type: 'final'
            },
            spoof: {
                label: 'spoof',
                onEntry : [console.log],
                onExit : [console.log],
                type: 'final'
            },
            woof: {
                label: 'woof',
                type: 'parallel',
                onEntry : [console.log],
                onExit : [console.log],
                on: {
                    WOOF: {
                        target: 'loaded',
                        entry : [console.log],
                        exit : [console.log]
                    }
                },
                states: {
                    majorTerm: {
                        type: 'final'
                    },
                    minorTerm: {
                        type: 'final'
                    }
                }
            }
        }
    };

    const widget = stateMachineFactory(widgetDescription);

    (function addHandlers(widget) {
        try {
            const processEventToStateMachine = function(){
                // send event to state machine.
                /* emit custom event from DOM element, if change in state of state machine.
                https://www.javascripttutorial.net/javascript-dom/javascript-custom-events/, which
                will trigger re-render on */
            };
        window.addEventListener("load", function () {
            //widget.sendEvent("LOAD");
            // widget.sendEvent("SELECT_MULTITERM");
            // widget.sendEvent("SWITCH_MAGNITUDE");
            // widget.sendEvent("SELECT_TWOTERM");
            //widget.sendEvent("SELECT_MULTITERM");
            //widget.sendEvent("SPOOF");
            widget.sendEvent("WOOF");
           //widget.sendEvent("ERROR");

            window.widget = widget;
        });

        } catch (e) {
            console.error(`Catching error: `, e);
            widget.sendEvent("ERROR");
        }
    }(widget));
} catch (e) {
    console.error(e);
}
