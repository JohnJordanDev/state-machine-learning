try {
    const stateMachineFactory = (function () {
        const Factory = function(stateMachineDescription) {
            let _state = stateMachineDescription['states'][stateMachineDescription.initial];
            const m = {
                __proto__: Factory.prototype,
                get state() {
                    return _state;
                },
                set state(newState) {
                    return _state = this.setNewState(_state, newState);
                },
                statePath: stateMachineDescription.initial,
                ...stateMachineDescription
            };
            return m
        };
        const _getDeepObject = function(TotalStateMachine){
            const listOfNestedStates = TotalStateMachine.getStatePath().split('.');
            if(1 === listOfNestedStates.length) {
                const baseState = listOfNestedStates.pop();
                return TotalStateMachine['states'][baseState];
            }

            let obj = TotalStateMachine['states'][listOfNestedStates[0]];

            for(let i = 1; i < listOfNestedStates.length; i++) {
                if(!obj['states'] || !obj['states'][listOfNestedStates[i]]) return obj;
                obj = obj['states'][listOfNestedStates[i]];
            }

            return obj;
        };

        const _getParentState = function(TotalStateMachine){
            const listOfNestedStates = TotalStateMachine.getStatePath().split('.');
            console.log('listOfNestedStates: ', listOfNestedStates);
            if(1 === listOfNestedStates.length) {
                return TotalStateMachine;
            }
            let obj = TotalStateMachine['states'][listOfNestedStates[0]];
            /*  TODO: Fix this as currently coming from ancestor -> child 
                and need to be: child -> ancestor
            */
            for(let i = listOfNestedStates.length - 1; i <= 0; i--) {
                obj = obj['states'][listOfNestedStates[i]];
            }
            return obj;
        };

        const _disallowedAction = function(msg) {
            console.warn('This action is not allowed: ', msg);
            return null;
        };

        Factory.prototype.setNewState = function(_state, newState) {
            if(typeof newState !== 'object') {
                _disallowedAction('Trying to set state to non-state object');
                return _state;
            }
            return newState;
        }
        /**
         * 
         * @param {string} event name of event sent to state machine
         */
        Factory.prototype.getAncestorStateWithAction = function(event) {
            const parentState = this.getParentState();
            const validActionsOnParent = parentState.on;
            if(validActionsOnParent && validActionsOnParent[event]) {
                return parentState;
            }
        };
    
    
        Factory.prototype.getStatePath = function() {
            return this.statePath;
        };
        Factory.prototype.getDeepestStateLabel = function() {
            return this.statePath.split('.').pop();
        };
        Factory.prototype.getDeepestState = function() {
           return _getDeepObject(this);
        };
        Factory.prototype.getParentState = function() {
            return _getParentState(this);
        };
        Factory.prototype.setStatePath = function(target, nested = false, direct = false) {
            const listOfStates = this.statePath.split('.');
            if(direct) {
                this.statePath = target;
                this.state = this.getDeepestState();
                return;
            }

            if(1 == listOfStates.length && !nested) {
                this.statePath = target;
                this.state = this.getDeepestState();
                return;
            }
            if(nested) {
                this.statePath += '.' + target;
                this.state = this.getDeepestState();
                return;
            }
            listOfStates[listOfStates.length -1] = target;
            
            this.statePath = listOfStates.join('.');
            this.state = this.getDeepestState();

            return;
        };
        Factory.prototype.sendEvent = function(event) {

            const currentState = this.state;
            if(currentState.type && 'final' ==  currentState.type) return;

            const validActions = currentState.on;
            const actionBeingTaken = validActions[event];
            const targetStateLabel = actionBeingTaken && actionBeingTaken.target;

            if(targetStateLabel) {
                this.transitionToNewState(actionBeingTaken);
            }  

            if(!actionBeingTaken) {
                const ancestorStateWithAction = this.getAncestorStateWithAction(event);
                const actionFromAncestor = ancestorStateWithAction.on[event];
                //TODO: needs fixing here, since need state updated to match.
                // bug in implementation of statepath, nesting where should not
                if(actionFromAncestor) {
                    this.setStatePath('spoof', false, true);
                    console.error(this.getParentState());
                    console.log(this.state);
                    
                    //this.transitionToNewState(actionFromAncestor);
                }
            }
            
        };
        /**
         * Move machine from current to new state, based on allowed action from current state
         * @param {object} action - action obj from current state (being transitioned from)
         */
        Factory.prototype.transitionToNewState = function(action) {
            const actionBeingTaken = action;
            const targetStateLabel = actionBeingTaken.target;
            if(!targetStateLabel) return;

            if(actionBeingTaken.exit) {
                for(let i = 0; i < actionBeingTaken.exit.length; i++) {
                    actionBeingTaken.exit[i](`Exiting '${this.statePath}' state`);
                }
            }
            this.setStatePath(targetStateLabel);

            // if new state is a compound state, enter initial sub-state
            // need to ensure we don't already have a substate set. 
            //TODO: add check that only first time this happens
            if(this.state.initial) {
                this.setStatePath(this.getDeepestState().initial, true);
            } else {
                // new state is atomic
                this.setStatePath(targetStateLabel);
            }

            if(actionBeingTaken.entry) {
                for(let i = 0; i < actionBeingTaken.entry.length; i++) {
                    actionBeingTaken.entry[i](`Entering '${this.statePath}' state.`);
                }
            }

        };
        return Factory;
    }());

    const loadedStates = {
        initial: 'twoTerm',
        states: {
            twoTerm: {
                label: 'twoTerm',
                on: {
                    SELECT_MULTITERM: {
                        target: 'multiTerm',
                        entry: [console.log],
                        exit: [console.log]
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
                        target: 'twoTerm',
                        entry: [console.log],
                        exit: [console.log]
                    },
                    ERROR: {
                        target: 'error'
                    }
                }
            },
            error: {
                label:'loaded.error',
                type: 'final'
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
                        target: 'loaded',
                        // could add guard conditions here, and check in blueprint: https://jonbellah.com/articles/intro-state-machines
                        entry : [console.log],
                        exit : [console.log]
                    },
                    ERROR: {
                        target: 'error',
                        entry : [console.log],
                        exit : [console.log]
                    }
                }
            },
            loaded: {
                label: 'loaded',
                on: {
                    ERROR: {
                        target: 'error',
                        entry : [console.log],
                        exit : [console.log]
                    },
                    SPOOF: {
                        target: 'spoof',
                        entry : [console.log],
                        exit : [console.log]
                    }
                },
                ...loadedStates
            },
            error: {
                label: 'error',
                type: 'final'
            },
            spoof: {
                label: 'spoof',
                type: 'final'
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
            widget.sendEvent("SPOOF");
           // widget.sendEvent("ERROR");

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
