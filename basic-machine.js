/** 
 * Notes
 * 1. Difference between 'jump' (using statePath; doesn't trigger entry/exit actions)
 *  and 'transition' (transition state; does trigger entry/exit actions)
 */
try {
    const stateMachineFactory = (function () {
        const Factory = function(stateMachineDescription) {
            let _state = stateMachineDescription['states'][stateMachineDescription.initial];
            let _statePath = stateMachineDescription.initial;
            const m = {
                __proto__: Factory.prototype,
                get state() {
                    return _state;
                },
                // TODO: Clear out this function, since statePath is source of truth
                set state(newState) {
                    if(!this.isNewStateValid(newState)) return;
                    //console.warn('using dangerous state method, which does not sync statePath');
                    //TODO: Need to update path here as well
                    return _state = newState;
                },
                get statePath() {
                    return _statePath;
                },
                set statePath(newPath) {
                    if(!this.isValidPath(newPath)) return;
                    _statePath = newPath;
                    // TODO: CHange this to set the private state variable
                    this.state = this.getStateFrameFromPath(_statePath);
                    console.info('state and statePath updated...');
                    console.log([this.state, this.statePath]);
                },
                ...stateMachineDescription,
                validStates: 
                    Object.keys(stateMachineDescription['states'])
                    .concat(['loaded.twoTerm', 'loaded.multiTerm', 'loaded.error'])
            };
            return m
        };

        const _disallowedAction = function(msg) {
            console.warn('This action is not allowed: ', msg);
            return null;
        };

        /**
         * @param {string} event name of event sent to state machine
         */
        Factory.prototype.getPathToAncestorStateWithAction = function(event) {
            if(!event) return console.warn('"Event" cannot be empty, when finding ancestor with action!');
            let pathList = this.statePath.split('.');
            // get parent path
            pathList.pop();
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
        Factory.prototype.getDeepestState = function( ) {
            const deepestState = this.getStateFrameFromPath(this.statePath);
            if(deepestState) return deepestState;
            throw new Error('deepest state not found from path');
        };
        //TODO: This is for CURRENT state ONLY
        Factory.prototype.getParentOfCurrentGlobalState = function() {
            let listOfNestedStates = this.statePath.split('.');
            console.warn(listOfNestedStates.length)
            if(1 === listOfNestedStates.length) {
                // returning state machine itself, as "root" above last ancestor states
                return this;
            }
            // get parent state path
            listOfNestedStates.pop();
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
        Factory.prototype.isNewStateValid = function(newState) {
            if(typeof newState !== 'object') {
                _disallowedAction('Invalid state string specified');
                return false;
            }
            return true;
        };
        Factory.prototype.isValidPath = function(newPath) {
            const pathExists = this.validStates.filter(path => path === newPath).length === 1;
            if(pathExists) return pathExists;
            throw new Error('invalid state path specified');
        };
        Factory.prototype.sendEvent = function(event) {
            console.warn('Event: ', event);
            const currentState = this.state;
            if(currentState.type && 'final' === currentState.type) return;

            const validActions = currentState.on;
            const actionBeingTaken = validActions[event];
            const targetStateLabel = actionBeingTaken && actionBeingTaken.target;

            if(targetStateLabel) {
                this.transitionToNewState(targetStateLabel);
            }  

            if(!actionBeingTaken) {
                console.warn('This event does NOT exist on this state: ', event);
                const pathToAncestorWithAction = this.getPathToAncestorStateWithAction(event);
                if(pathToAncestorWithAction) {
                    // Note: difference here between 'jump' and 'transition' (entry/exit actions triggered) to states
                    this.statePath = pathToAncestorWithAction;

                    const validActions = this.state.on;
                    const actionBeingTaken = validActions[event];
                    const targetStateLabel = actionBeingTaken && actionBeingTaken.target;
                    if(targetStateLabel) {
                        this.transitionToNewState(targetStateLabel);
                    }
                }
            }
            
        };
        /**
         * Move machine from current to new state, based on allowed and present action from current state
         * @param {string} targetStateLabel - name of sibling state to transition to
         * 
         */
        Factory.prototype.transitionToNewState = function(targetStateLabel) {
            if(!targetStateLabel) return;
            console.info('callng with: ', targetStateLabel)

            // if(actionBeingTaken.exit) {
            //     for(let i = 0; i < actionBeingTaken.exit.length; i++) {
            //         actionBeingTaken.exit[i](`Exiting '${this.statePath}' state`);
            //     }
            // }
            
            const parentState = this.getParentOfCurrentGlobalState();
            const siblingStates = parentState.states;
            
            // safe to make transition
            if(siblingStates && siblingStates[targetStateLabel]) {
                this.updateStatePath(targetStateLabel);
            }

            //TODO: Need to further transition state deep down, if nested states
            if(this.state.initial) {
                console.warn('setting nested state: ', this.getDeepestState().initial);
                this.updateStatePath(this.getDeepestState().initial, {nested: true});
                //TODO need recursive call here to keep diving down into nested states 
            } else {
                // new state is atomic
                this.updateStatePath(targetStateLabel);
            }

            // if(actionBeingTaken.entry) {
            //     for(let i = 0; i < actionBeingTaken.entry.length; i++) {
            //         actionBeingTaken.entry[i](`Entering '${this.statePath}' state.`);
            //     }
            // }

        };
        // TODO
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
                        this.statePath = target;
                        return;
                    }
        
                    if(1 == listOfStates.length && !nested) {
                        this.statePath = target;
                        return;
                    }
                    if(nested) {
                        this.statePath += '.' + target;
                        return;
                    }
                    listOfStates[listOfStates.length -1] = target;
                    
                    this.statePath = listOfStates.join('.');
        
                    return;
                };
        return Factory;
    }());

    const loadedStates = {
        initial: 'twoTerm',
        states: {
            twoTerm: {
                label: 'twoTerm',
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
