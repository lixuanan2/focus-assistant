import { DEFAULT_GROUP_ID } from "../../core/settings/defaults.js";
import { GROUP_MODES, getGroupModeLabelKey } from "../../core/grouping/modes.js";

export function createGroupSection({
  elements,
  t,
  getSettings,
  getSelectedGroupId,
  setSelectedGroupId,
  withDraftMutation,
  setFeedback
}) {
  initializeEvents();

  return {
    render
  };

  function initializeEvents() {
    elements.newGroupInput.placeholder = t("newGroupPlaceholder");
    elements.addGroupButton.addEventListener("click", addGroup);
    elements.newGroupInput.addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        event.preventDefault();
        addGroup();
      }
    });
  }

  function render(settings) {
    elements.groupCount.textContent = String(settings.groups.length);
    elements.groupList.replaceChildren(...settings.groups.map((group, index) => createGroupRow(group, index)));
  }

  function createGroupRow(group, index) {
    const groupSites = getSettings().blockedSites
      .filter((site) => site.groupId === group.id)
      .map((site) => site.domain);

    const row = document.createElement("div");
    row.className = "group-row";
    row.role = "listitem";
    row.tabIndex = 0;
    row.classList.toggle("is-selected", group.id === getSelectedGroupId());
    row.addEventListener("click", () => {
      setSelectedGroupId(group.id);
    });
    row.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        setSelectedGroupId(group.id);
      }
    });

    const name = document.createElement("span");
    name.className = "group-name";
    name.textContent = group.name;
    name.title = group.name;

    const count = document.createElement("span");
    count.className = "group-count";
    count.textContent = String(groupSites.length);

    const modes = document.createElement("span");
    modes.className = "group-mode-summary";
    modes.textContent = getModeSummary(group, t);

    const removeButton = document.createElement("button");
    removeButton.className = "icon-button";
    removeButton.type = "button";
    removeButton.textContent = t("removeGroupButton");
    removeButton.disabled = group.id === DEFAULT_GROUP_ID;
    removeButton.addEventListener("click", (event) => {
      stopPropagation(event);
      withDraftMutation((settings) => {
        const fallbackGroupId = DEFAULT_GROUP_ID;
        settings.groups = settings.groups.filter((item) => item.id !== group.id);
        settings.blockedSites = settings.blockedSites.map((site) => ({
          ...site,
          groupId: site.groupId === group.id ? fallbackGroupId : site.groupId
        }));
      });
      setSelectedGroupId(getSettings().groups[0]?.id ?? DEFAULT_GROUP_ID);
    });

    const preview = createPreview(groupSites);

    row.append(name, count, modes, removeButton, preview);

    return row;
  }

  function createPreview(groupSites) {
    const preview = document.createElement("div");
    preview.className = "group-preview";

    const label = document.createElement("div");
    label.className = "group-preview-label";
    label.textContent = t("groupPreviewLabel");
    preview.append(label);

    if (groupSites.length === 0) {
      const empty = document.createElement("div");
      empty.className = "group-preview-empty";
      empty.textContent = t("groupPreviewEmpty");
      preview.append(empty);
      return preview;
    }

    const list = document.createElement("div");
    list.className = "group-preview-list";

    for (const domain of groupSites.slice(0, 3)) {
      const item = document.createElement("span");
      item.className = "group-preview-item";
      item.textContent = domain;
      item.title = domain;
      list.append(item);
    }

    preview.append(list);

    if (groupSites.length > 3) {
      const more = document.createElement("div");
      more.className = "group-preview-more";
      more.textContent = t("groupPreviewMore", String(groupSites.length - 3));
      preview.append(more);
    }

    return preview;
  }

  function addGroup() {
    const groupName = elements.newGroupInput.value.trim();

    if (!groupName) {
      setFeedback(t("invalidGroupMessage"));
      return;
    }

    const exists = getSettings().groups.some((group) => group.name === groupName);

    if (exists) {
      setFeedback(t("duplicateGroupMessage"));
      return;
    }

    withDraftMutation((settings) => {
      const nextGroupId = `group-${Date.now()}`;
      settings.groups.push({
        id: nextGroupId,
        name: groupName,
        modes: {
          permanent: false,
          manual: true,
          schedule: true,
          pomodoro: true
        }
      });
      setSelectedGroupId(nextGroupId, true, true);
    });

    elements.newGroupInput.value = "";
    setFeedback("");
  }
}

function getModeSummary(group, t) {
  const activeModes = GROUP_MODES.filter((mode) => group.modes[mode]).map(
    (mode) => t(getGroupModeLabelKey(mode))
  );

  if (activeModes.length === 0) {
    return t("groupModesNone");
  }

  if (activeModes.length === 1) {
    return activeModes[0];
  }

  return `${activeModes[0]} +${activeModes.length - 1}`;
}

function stopPropagation(event) {
  event.stopPropagation();
}
