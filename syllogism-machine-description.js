const syllogismDescription = {
  initial: "loading",
  label: "rootState",
  states: {
    loading: {
      label: "loading",
      on: {
        LOAD: {
          target: "loaded"
        },
        ERROR: {
          target: "loadingFailed"
        }
      }
    },
    loaded: {
      label: "loaded",
      initial: "clean",
      on: {
        ERROR: {
          target: "error"
        }
      },
      states: {
        clean: {
          label: "clean",
          on: {
            TOUCH: {
              target: "dirty"
            }
          }
        },
        dirty: {
          type: "final"
        }
      }
    },
    loadingFailed: {
      label: "loadingFailed",
      type: "final"
    },
    error: {
      label: "error",
      type: "final"
    }
  },
  validStates: [
    "loaded.clean"
  ]
};

try {
  const widgetRef = window.stateMachineFactory(syllogismDescription);

  (function addHandlers(widget) {
    try {
      const processEventToStateMachine = function () {
        // send event to state machine.
        /* emit custom event from DOM element, if change in state of state machine.
                https://www.javascripttutorial.net/javascript-dom/javascript-custom-events/, which
                will trigger re-render on */
      };
      window.widget = widget;
      widget.sendEvent("ERROR");
      window.addEventListener("load", () => {
        widget.sendEvent("LOAD");
      });
    } catch (e) {
      console.error("Catching error: ", e);
      widget.sendEvent("ERROR");
    }
  }(widgetRef));
} catch (error) {
  // eslint-disable-next-line no-console
  console.error("An error occured: ", error);
}
