try {
    const stateMachineFactory = (function () {
        const Factory = function(stateMachineDescription) {
            const m = {
                __proto__: Factory.prototype,
                state: stateMachineDescription.initial,
                ...stateMachineDescription
            };
            return m
        };
        Factory.prototype.getState = function() {
            return this.state
        };
        Factory.prototype.setState = function(target) {
            return this.state = target;
        };
        Factory.prototype.sendEvent = function(action) {
            const currentStateLabel = this.state;
            if('final' ==  this.states[currentStateLabel].type) return;
            const validActions = this.states[currentStateLabel].on;
            const actionBeingTaken = validActions[action];
            if(actionBeingTaken && actionBeingTaken.target) {
                for(let i = 0; i < actionBeingTaken.exit.length; i++) {
                    actionBeingTaken.exit[i](`Exiting '${this.state}' state`);
                }
                this.setState(actionBeingTaken.target);
                for(let i = 0; i < actionBeingTaken.entry.length; i++) {
                    actionBeingTaken.entry[i](`Entering '${this.state}' state.`);
                }
            }
        }
        return Factory;
    }());

    const widgetDescription = {
        initial: 'loading',
        states: {
            loading : {
                on : {
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
            loaded : {
                on : {
                    ERROR: {
                        target: 'error',
                        entry : [console.log],
                        exit : [console.log]
                    }
                }
            },
            error : {
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
            console.log(`Widget state is: '${ widget.getState()}'`);
            widget.sendEvent("LOAD");
        });

        } catch (e) {
            console.error(`Catching error: `, e);
            widget.sendEvent("ERROR");
        }
    }(widget));
} catch (e) {
    console.error(e);
}
