try {
  const widgetRef = window.stateMachineFactory(window.syllogismDescription);

  const addHandlers = function addHandlers(widget) {
    try {
      const machineDomTarget = document.getElementById("machine-target");

      const renderMachineToDOM = function (machine, DOMTarget) {
        // eslint-disable-next-line no-param-reassign
        DOMTarget.innerHTML = (window.machineDOMTemplate(machine));
      };

      renderMachineToDOM(widget, machineDomTarget);

      const processEventToStateMachine = function (event, machine) {
        const initialState = widget.statePath;

        machine.sendEvent(event);

        if (initialState !== machine.statePath) {
          renderMachineToDOM(machine, machineDomTarget);
        }
      };

      setTimeout(() => {
        // processEventToStateMachine("ERROR", window.widget);
        processEventToStateMachine("LOAD", widget);
      }, 2000);

      window.widget = widget;

      document.addEventListener("click", (e) => {
        const elem = e.target;
        const eventType = elem.dataset && elem.dataset.event;
        if (eventType) {
          if (eventType === "RELOAD") {
            window.widget = window.stateMachineFactory(window.syllogismDescription);
            renderMachineToDOM(window.widget, machineDomTarget);
            return;
          }
          processEventToStateMachine(eventType, widget);
        }
      });
    } catch (e) {
      console.error("Catching error: ", e);
      widget.sendEvent("ERROR");
    }
  };

  addHandlers(widgetRef);
} catch (error) {
  // eslint-disable-next-line no-console
  console.error("An error occured: ", error);
}
