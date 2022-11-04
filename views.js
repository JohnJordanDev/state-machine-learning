const getActionButton = function (statePath) {
  const types = {
    error: {
      msg: "Reload",
      event: "RELOAD"
    },
    "loaded.clean": {
      msg: "Touch",
      event: "TOUCH"
    },
    "loaded.dirty": {
      msg: "Clean",
      event: "CLEAN"
    }
  };
  if (!types[statePath]) return "";
  const type = types[statePath];
  const button = `<button data-event="${type.event}">${type.msg}</button>`;
  return button;
};

const machineDOMTemplate = (machine) => {
  const { statePath } = machine;

  const response = `<section>
        <p>Machine is in the "${machine.getStateFrameFromPath().label}" state</p>
      </section>
      ${getActionButton(statePath)}`;

  return response;
};

window.machineDOMTemplate = machineDOMTemplate;
