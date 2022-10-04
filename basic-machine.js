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
                    this.state = this.getDeepestState();
                    console.info('state and statePath updated...');
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
        Factory.prototype.getAncestorStateWithAction = function(event) {
            // let localStatePath = this.statePath.split('.');
            // let deepestStateLabel = localStatePath.pop();
            
            // console.log('localStatePath: ', localStatePath);
            // let testParentState = this.getDeepestState([deepestStateLabel]);
            // console.log('testParentState: ', testParentState);
            // if(1 === localStatePath.length) {
            //     console.info('parent is root machine');
            //     testParentState = this;
            // }

            // console.info('parent label: ', testParentState.label);

            let parentState = this.getParentState();
            while("rootState" !== parentState.label) {
                const validActionsOnParent = parentState.on;
                //TODO: Need to avoid changing state of the machine while searching
                this.statePath = parentState.label;
                if(validActionsOnParent && validActionsOnParent[event]) {
                    return parentState;
                }
                parentState = this.getParentState();
            };
            return null;
        };
    
        Factory.prototype.getDeepestStateLabel = function() {
            return this.statePath.split('.').pop();
        };
        Factory.prototype.getDeepestState = function(passedInPath = []) {
            const listOfNestedStates = passedInPath || this.statePath.split('.');
            if(1 === listOfNestedStates.length) {
                const baseState = listOfNestedStates.pop();
                return this['states'][baseState];
            }

            let obj = this['states'][listOfNestedStates[0]];

            for(let i = 1; i < listOfNestedStates.length; i++) {
                if(!obj['states'] || !obj['states'][listOfNestedStates[i]]) return obj;
                obj = obj['states'][listOfNestedStates[i]];
            }

            return obj;
        };
        Factory.prototype.getParentState = function() {
            const listOfNestedStates = this.statePath.split('.');
            if(1 === listOfNestedStates.length) {
                return this;
            }
            let obj = this['states'][listOfNestedStates[0]];
            /*  TODO: Fix this as currently coming from ancestor -> child 
                and need to be: child -> ancestor
            */
            for(let i = listOfNestedStates.length - 1; i <= 0; i--) {
                obj = obj['states'][listOfNestedStates[i]];
            }
            return obj;
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
                if(ancestorStateWithAction) {
                    const actionFromAncestor = ancestorStateWithAction.on[event];
                //TODO: needs fixing here, since need state updated to match.
                // bug in implementation of statepath, nesting where should not
                if(actionFromAncestor) {
                    this.updateStatePath('spoof', {nested: false, direct: true});
                    console.error(this.getParentState());
                    console.log(this.state);
                    
                    //this.transitionToNewState(actionFromAncestor);
                }
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
            this.updateStatePath(targetStateLabel);

            // if new state is a compound state, enter initial sub-state
            // need to ensure we don't already have a substate set.

            //TODO: add check that only first time this happens
            if(this.state.initial) {
                this.updateStatePath(this.getDeepestState().initial, {nested: true});
            } else {
                // new state is atomic
                this.updateStatePath(targetStateLabel);
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
