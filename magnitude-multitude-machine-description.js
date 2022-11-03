const typeStates = {
  initial: "multitude",
  states: {
    multitude: {
      on: {
        SWITCH_MAGNITUDE: {
          target: "magnitude"
        }
      }
    },
    magnitude: {
      on: {
        SWITCH_MULTITUDE: {
          target: "multitude"
        }
      }
    }
  }
};

const loadedStates = {
  initial: "twoTerm",
  states: {
    twoTerm: {
      label: "twoTerm",
      initial: "multitude",
      on: {
        SELECT_TWOTERM: {
          target: null
        },
        SELECT_MULTITERM: {
          target: "multiTerm"
        },
        ERROR: {
          target: "error"
        }
      },
      ...typeStates
    },
    multiTerm: {
      label: "multiTerm",
      initial: "multitude",
      on: {
        SELECT_TWOTERM: {
          target: "twoTerm"
        },
        ERROR: {
          target: "error"
        }
      },
      ...typeStates
    },
    error: {
      label: "loaded.error",
      onEntry: [console.log],
      onExit: [console.log],
      type: "final"
    }
  }
};

const widgetDescription = {
  initial: "loading",
  label: "rootState",
  states: {
    loading: {
      label: "loading",
      on: {
        LOAD: {
          target: "loaded"
          // could add guard conditions here, and check in blueprint: https://jonbellah.com/articles/intro-state-machines
        },
        ERROR: {
          target: "error"
        },
        WOOF: {
          target: "woof"
        }
      }
    },
    loaded: {
      label: "loaded",
      onEntry: [console.log],
      onExit: [console.log],
      on: {
        ERROR: {
          target: "error"
        },
        SPOOF: {
          target: "spoof"
        },
        WOOF: {
          target: "woof"
        }
      },
      ...loadedStates
    },
    error: {
      label: "error",
      onEntry: [console.log],
      onExit: [console.log],
      type: "final"
    },
    spoof: {
      label: "spoof",
      onEntry: [console.log],
      onExit: [console.log],
      type: "final"
    },
    woof: {
      label: "woof",
      type: "parallel",
      onEntry: [console.log],
      onExit: [console.log],
      on: {
        WOOF: {
          target: "loaded",
          entry: [console.log],
          exit: [console.log]
        }
      },
      states: {
        majorTerm: {
          ...typeStates
        },
        minorTerm: {
          type: "final"
        }
      }
    }
  },
  validStates: [
    "loaded.twoTerm",
    "loaded.multiTerm",
    "loaded.error",
    "loaded.twoTerm.multitude",
    "loaded.twoTerm.magnitude",
    "loaded.multiTerm.multitude",
    "loaded.multiTerm.magnitude",
    "woof.-majorTerm-minorTerm",
    "woof.-majorTerm-minorTerm.multitude"
  ]
};
