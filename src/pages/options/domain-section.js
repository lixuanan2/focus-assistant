import { normalizeBlockedSiteEntry } from "../../core/blocking/domain.js";
import { GROUP_MODES, getGroupModeLabelKey } from "../../core/grouping/modes.js";
import { DEFAULT_GROUP_ID } from "../../core/settings/defaults.js";

const PLACEHOLDER_ROW_COUNT = 6;

export function createDomainSection({
  elements,
  t,
  getSettings,
  getSelectedGroupId,
  withDraftMutation,
  setFeedback
}) {
  initializeEvents();

  return {
    render
  };

  function initializeEvents() {
    elements.newDomainInput.placeholder = t("newDomainPlaceholder");
    elements.addDomainButton.addEventListener("click", addDomain);
    elements.newDomainInput.addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        event.preventDefault();
        addDomain();
      }
    });
    elements.selectedGroupNameInput.addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        event.preventDefault();
        elements.selectedGroupNameInput.blur();
      }
    });
  }

  function render(settings) {
    const selectedGroup = settings.groups.find((group) => group.id === getSelectedGroupId()) ?? settings.groups[0];
    const hasSelectedGroup = Boolean(getSelectedGroupId() && selectedGroup);
    const groupSites = settings.blockedSites.filter((site) => site.groupId === selectedGroup?.id);

    elements.groupOverviewPage.hidden = hasSelectedGroup;
    elements.groupDetailPage.hidden = !hasSelectedGroup;

    if (!hasSelectedGroup) {
      elements.domainCount.textContent = "0 / 0";
      elements.selectedGroupLabel.textContent = t("blockedDomainsLabel");
      elements.selectedGroupMeta.textContent = "";
      elements.domainList.replaceChildren();
      renderGroupDetail(null);
      return;
    }

    elements.selectedGroupLabel.textContent = selectedGroup.name;
    elements.selectedGroupMeta.textContent = t("groupDetailMeta", String(groupSites.length));
    renderGroupDetail(selectedGroup);
    elements.domainCount.textContent = `${groupSites.filter((site) => site.enabled).length} / ${groupSites.length}`;
    renderDomainList(groupSites, selectedGroup);
  }

  function renderGroupDetail(selectedGroup) {
    elements.selectedGroupNameInput.value = selectedGroup?.name ?? "";
    elements.selectedGroupNameInput.disabled = !selectedGroup;
    elements.selectedGroupModes.replaceChildren();

    if (!selectedGroup) {
      return;
    }

    elements.selectedGroupNameInput.onchange = () => renameSelectedGroup(selectedGroup.id);

    for (const mode of GROUP_MODES) {
      const modeLabel = document.createElement("label");
      modeLabel.className = "group-detail-mode-chip";

      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.checked = Boolean(selectedGroup.modes[mode]);
      checkbox.addEventListener("change", () => {
        withDraftMutation((settings) => {
          const target = settings.groups.find((group) => group.id === selectedGroup.id);

          if (target) {
            target.modes[mode] = checkbox.checked;
          }
        });
      });

      const text = document.createElement("span");
      text.textContent = t(getGroupModeLabelKey(mode));

      modeLabel.append(checkbox, text);
      elements.selectedGroupModes.append(modeLabel);
    }
  }

  function renderDomainList(blockedSites, selectedGroup) {
    const rows = blockedSites.map((site) => createDomainRow(site));
    const placeholderCount = Math.max(PLACEHOLDER_ROW_COUNT - blockedSites.length, 0);

    if (blockedSites.length === 0 && selectedGroup) {
      rows.push(createEmptyStateRow(selectedGroup));
    }

    for (let index = 0; index < placeholderCount; index += 1) {
      rows.push(createPlaceholderRow());
    }

    if (rows.length === 0) {
      rows.push(createPlaceholderRow());
    }

    elements.domainList.replaceChildren(...rows);
  }

  function createDomainRow(site) {
    const row = document.createElement("div");
    row.className = "domain-row";
    row.role = "listitem";

    const toggleLabel = document.createElement("label");
    toggleLabel.className = "domain-toggle";

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.checked = site.enabled;
    checkbox.addEventListener("change", () => {
      withDraftMutation((settings) => {
        const target = settings.blockedSites.find((item) => item.domain === site.domain);

        if (target) {
          target.enabled = checkbox.checked;
        }
      });
    });

    toggleLabel.append(checkbox);

    const domainName = document.createElement("span");
    domainName.className = "domain-name";
    domainName.textContent = site.domain;
    domainName.title = site.domain;

    const removeButton = document.createElement("button");
    removeButton.className = "icon-button";
    removeButton.type = "button";
    removeButton.textContent = t("removeDomainButton");
    removeButton.addEventListener("click", () => {
      withDraftMutation((settings) => {
        settings.blockedSites = settings.blockedSites.filter((item) => item.domain !== site.domain);
      });
    });

    row.append(toggleLabel, domainName, removeButton);

    return row;
  }

  function createEmptyStateRow(selectedGroup) {
    const row = document.createElement("div");
    row.className = "domain-row domain-row-empty";
    row.role = "listitem";

    const message = document.createElement("div");
    message.className = "domain-empty-message";
    message.textContent = t("emptyGroupMessage", selectedGroup.name);

    row.append(message);

    return row;
  }

  function createPlaceholderRow() {
    const row = document.createElement("div");
    row.className = "domain-row";
    row.dataset.placeholder = "true";
    row.setAttribute("aria-hidden", "true");

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";

    const domainName = document.createElement("span");
    domainName.className = "domain-name";
    domainName.textContent = "placeholder.local";

    const removeButton = document.createElement("button");
    removeButton.className = "icon-button";
    removeButton.type = "button";
    removeButton.textContent = t("removeDomainButton");

    row.append(checkbox, domainName, removeButton);

    return row;
  }

  function addDomain() {
    const entry = normalizeBlockedSiteEntry(elements.newDomainInput.value);

    if (!entry) {
      setFeedback(t("invalidDomainMessage"));
      return;
    }

    const exists = getSettings().blockedSites.some((site) => site.domain === entry.domain);

    if (exists) {
      setFeedback(t("duplicateDomainMessage"));
      return;
    }

    withDraftMutation((settings) => {
      settings.blockedSites.push({
        ...entry,
        groupId: getSelectedGroupId() || DEFAULT_GROUP_ID
      });
      settings.blockedSites.sort((left, right) => left.domain.localeCompare(right.domain));
    });

    elements.newDomainInput.value = "";
    setFeedback("");
  }

  function renameSelectedGroup(groupId) {
    const nextName = elements.selectedGroupNameInput.value.trim();

    if (!nextName) {
      setFeedback(t("invalidGroupMessage"));
      render(getSettings());
      return;
    }

    const hasDuplicateName = getSettings().groups.some(
      (group) => group.id !== groupId && group.name === nextName
    );

    if (hasDuplicateName) {
      setFeedback(t("duplicateGroupMessage"));
      render(getSettings());
      return;
    }

    withDraftMutation((settings) => {
      const target = settings.groups.find((group) => group.id === groupId);

      if (target) {
        target.name = nextName;
      }
    });
    setFeedback("");
  }
}
