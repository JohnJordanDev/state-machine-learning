/** 
 * Notes
 * 1. Difference between 'jump' (using statePath; doesn't trigger entry/exit actions)
 *  and 'transition' (transition state; does trigger entry/exit actions)
 * 2. When adding a new state (atomic or nested), need to add to validState list
 */
try {
    const stateMachineFactory = (function () {
        const _disallowedAction = function(msg) {
            console.warn('This action is not allowed: ', msg);
            return null;
        };
        const Factory = function(stateMachineDescription) {
            let _state = stateMachineDescription['states'][stateMachineDescription.initial];
            let _statePath = stateMachineDescription.initial;
            const m = {
                __proto__: Factory.prototype,
                get state() {
                    return _state;
                },
                set state(newState) {
                    _disallowedAction(`Trying to set manually, to '${newState}'`)
                    return null;
                },
                get statePath() {
                    return _statePath;
                },
                set statePath(newPath) {
                    if(!this.isValidPath(newPath)) return;
                    _statePath = newPath;
                    _state = this.getStateFrameFromPath(_statePath);
                    console.info('State has changed...', [this.state, this.statePath]);
                },
                ...stateMachineDescription,
                //TODO: this could be replaced with an actual check on the state machine, to see if path corresponds to a state
                validStates: 
                    Object.keys(stateMachineDescription['states'])
                    .concat(['loaded.twoTerm', 
                    'loaded.multiTerm', 
                    'loaded.error', 
                    'loaded.twoTerm.multitude', 
                    'loaded.twoTerm.magnitude'])
            };
            return m
        };
        /**
         * 
         * @param {object} state state undergoing transition event
         * @param {string} actionList name of property on state, which lists functions 
         */
        Factory.prototype.doStateTransitionActions = function(state, actionListName = 'onExit') {
            //_disallowedAction('action list NOT on state.');
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
        Factory.prototype.isValidPath = function(newPath) {
            console.log(newPath, ' from is valid');
            const pathExists = this.validStates.filter(path => path === newPath).length === 1;
            if(pathExists) return pathExists;
            throw new Error('new state path not on validState list: ' + newPath);
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
                    this.updateStatePath(pathToAncestorWithAction, {direct: true});

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
            const siblingStates = parentState.states;
            
            // safe to make transition
            if(siblingStates && siblingStates[targetStateLabel]) {
                this.updateStatePath(targetStateLabel);
            }

            //TODO: Need to further transition state deep down, if nested states
            if(this.state.initial) {
               
                this.updateStatePath(this.state.initial, {nested: true});
                //TODO need recursive call here to keep diving down into nested states 
                while(this.state.initial) {
                    console.warn('setting nested state in WHILE loop: ', this.state.initial, this.statePath);
                    this.updateStatePath(this.state.initial, {nested: true});
                }
            }
        };
        /**
         * Updates the machine's state path, based on various parameters
         * @param {string} target new state to append/set, depending on config
         * @param {object} config 
         * @returns 
         */
        Factory.prototype.updateStatePath = function(target, 
                    config = {nested: false, direct: false}
                ) {
                    const {nested, direct} = config;
                    const listOfStates = this.statePath.split('.');
                    if(direct) {
                        console.log('direct, ', this.statePath, target);
                        this.statePath = target;
                        return this.hasJustJumpedToParentState = true;
                    }
                    if(!this.hasJustJumpedToParentState) {
                        // don't want to trigger onEntry actions when jumping direct from child state 
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
            },
            multiTerm: {
                label: 'multiTerm',
                on: {
                    SELECT_TWOTERM: {
                        target: 'twoTerm'
                    },
                    ERROR: {
                        target: 'error'
                    }
                }
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
                onEntry : [console.log],
                onExit : [console.log],
                on: {
                    WOOF: {
                        target: 'loaded',
                        entry : [console.log],
                        exit : [console.log]
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
            widget.sendEvent("LOAD");
            //widget.sendEvent("SELECT_MULTITERM");
            //widget.sendEvent("SELECT_TWOTERM");
            //widget.sendEvent("SPOOF");
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
