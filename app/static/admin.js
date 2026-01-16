"use strict";

const ADMIN_REFRESH_ID = "admin-refresh";
const ADMIN_STATUS_ID = "admin-status";
const HOUSEHOLDS_TABLE_ID = "households-table";
const PERSONS_TABLE_ID = "persons-table";
const VEHICLES_TABLE_ID = "vehicles-table";
const MILEAGE_SCALE_TABLE_ID = "mileage-scale-table";
const PERSON_SELECT_ID = "person-select";
const ENTRY_YEAR_ID = "entry-year";
const ENTRY_REFRESH_ID = "entry-refresh";
const ENTRY_STATUS_ID = "entry-status";
const MILEAGE_TABLE_ID = "mileage-table";
const MEAL_TABLE_ID = "meal-table";
const OTHER_TABLE_ID = "other-table";
const MILEAGE_ADD_FORM_ID = "mileage-add-form";
const MEAL_ADD_FORM_ID = "meal-add-form";
const OTHER_ADD_FORM_ID = "other-add-form";
const MILEAGE_EDIT_DIALOG_ID = "mileage-edit-dialog";
const MEAL_EDIT_DIALOG_ID = "meal-edit-dialog";
const OTHER_EDIT_DIALOG_ID = "other-edit-dialog";

const API_ENDPOINTS = {
  households: "/households",
  persons: "/persons",
  vehicles: "/vehicles",
  mileage: "/mileage",
  meals: "/meals",
  otherExpenses: "/other-expenses",
  details: "/api/people",
  mileageScale: "/api/mileage-scale",
};

const state = {
  households: [],
  persons: [],
  vehicles: [],
  mileageScale: [],
  details: {
    mileage: [],
    meals: [],
    other: [],
  },
};

/**
 * Role: Get a DOM element by id.
 * Inputs: elementId - DOM element id.
 * Outputs: HTMLElement.
 * Errors: Throws if the element is missing.
 */
function getElement(elementId) {
  const element = document.getElementById(elementId);
  if (!element) {
    throw new Error(`Element introuvable: ${elementId}`);
  }
  return element;
}

/**
 * Role: Update a DOM element text.
 * Inputs: elementId and text.
 * Outputs: None.
 * Errors: Throws if the element is missing.
 */
function setText(elementId, text) {
  const element = getElement(elementId);
  element.textContent = text;
}

/**
 * Role: Fetch JSON from an endpoint.
 * Inputs: url and optional fetch options.
 * Outputs: Parsed JSON data.
 * Errors: Throws on HTTP or parsing errors.
 */
async function fetchJson(url, options) {
  const response = await fetch(url, options);
  if (!response.ok) {
    const message = `Erreur HTTP ${response.status}`;
    throw new Error(message);
  }
  return response.json();
}

/**
 * Role: Render a table body with rows.
 * Inputs: tableBody and row elements.
 * Outputs: None.
 * Errors: None.
 */
function renderTable(tableBody, rows) {
  const body = getElement(tableBody);
  body.innerHTML = "";
  rows.forEach((row) => {
    body.appendChild(row);
  });
}

/**
 * Role: Build a table row with cell values.
 * Inputs: list of cell values.
 * Outputs: Table row element.
 * Errors: None.
 */
function buildRow(cells) {
  const row = document.createElement("tr");
  cells.forEach((cell) => {
    const column = document.createElement("td");
    if (cell instanceof HTMLElement) {
      column.appendChild(cell);
    } else {
      column.textContent = cell;
    }
    row.appendChild(column);
  });
  return row;
}

/**
 * Role: Build an empty row with a message.
 * Inputs: message and column count.
 * Outputs: Table row element.
 * Errors: None.
 */
function buildEmptyRow(message, columnCount) {
  const row = document.createElement("tr");
  const cell = document.createElement("td");
  cell.colSpan = columnCount;
  cell.className = "empty";
  cell.textContent = message;
  row.appendChild(cell);
  return row;
}

/**
 * Role: Build a menu cell with edit/delete actions.
 * Inputs: entryType and entryId.
 * Outputs: Table cell content element.
 * Errors: None.
 */
function buildMenuCell(entryType, entryId) {
  const container = document.createElement("div");
  container.className = "menu-cell";

  const button = document.createElement("button");
  button.type = "button";
  button.className = "menu-button";
  button.setAttribute("aria-label", "Actions");
  button.dataset.menuFor = `${entryType}-${entryId}`;
  button.textContent = "⋯";

  const menu = document.createElement("div");
  menu.className = "row-menu";
  menu.id = `${entryType}-${entryId}`;

  const edit = document.createElement("button");
  edit.type = "button";
  edit.textContent = "Modifier";
  edit.dataset.action = "edit";
  edit.dataset.entryType = entryType;
  edit.dataset.entryId = String(entryId);

  const remove = document.createElement("button");
  remove.type = "button";
  remove.textContent = "Supprimer";
  remove.dataset.action = "delete";
  remove.dataset.entryType = entryType;
  remove.dataset.entryId = String(entryId);

  menu.appendChild(edit);
  menu.appendChild(remove);
  container.appendChild(button);
  container.appendChild(menu);

  return container;
}

/**
 * Role: Close all row menus.
 * Inputs: None.
 * Outputs: None.
 * Errors: None.
 */
function closeAllMenus() {
  document.querySelectorAll(".row-menu.is-open").forEach((menu) => {
    menu.classList.remove("is-open");
  });
}

/**
 * Role: Toggle a menu by id.
 * Inputs: menuId string.
 * Outputs: None.
 * Errors: None.
 */
function toggleMenu(menuId) {
  const menu = document.getElementById(menuId);
  if (!menu) {
    return;
  }
  const isOpen = menu.classList.contains("is-open");
  closeAllMenus();
  if (!isOpen) {
    menu.classList.add("is-open");
  }
}

/**
 * Role: Read the selected person id.
 * Inputs: None.
 * Outputs: Person id number.
 * Errors: Throws if value is invalid.
 */
function getSelectedPersonId() {
  const select = getElement(PERSON_SELECT_ID);
  const value = Number.parseInt(select.value, 10);
  if (!Number.isFinite(value)) {
    throw new Error("Personne invalide");
  }
  return value;
}

/**
 * Role: Read the selected year.
 * Inputs: None.
 * Outputs: Year number.
 * Errors: Throws if value is invalid.
 */
function getSelectedYear() {
  const yearInput = getElement(ENTRY_YEAR_ID);
  const value = Number.parseInt(yearInput.value, 10);
  if (!Number.isFinite(value)) {
    throw new Error("Année invalide");
  }
  return value;
}

/**
 * Role: Populate the person select options.
 * Inputs: list of persons.
 * Outputs: None.
 * Errors: None.
 */
function renderPersonSelect(people) {
  const select = getElement(PERSON_SELECT_ID);
  select.innerHTML = "";
  people.forEach((person) => {
    const option = document.createElement("option");
    option.value = String(person.id);
    option.textContent = `${person.first_name} ${person.last_name}`;
    select.appendChild(option);
  });
}

/**
 * Role: Render the vehicle select options for the selected person.
 * Inputs: personId and vehicles list.
 * Outputs: None.
 * Errors: None.
 */
function renderVehicleSelect(personId, vehicles) {
  const select = getElement("mileage-vehicle");
  const editSelect = getElement("mileage-edit-vehicle");
  select.innerHTML = "";
  editSelect.innerHTML = "";
  vehicles
    .filter((vehicle) => vehicle.person_id === personId)
    .forEach((vehicle) => {
      const option = document.createElement("option");
      option.value = String(vehicle.id);
      option.textContent = `${vehicle.name} (${vehicle.power_cv} CV)`;
      select.appendChild(option);

      const editOption = option.cloneNode(true);
      editSelect.appendChild(editOption);
    });
}

/**
 * Role: Render the household table.
 * Inputs: None.
 * Outputs: None.
 * Errors: None.
 */
function renderHouseholds() {
  const rows = state.households.map((household) => {
    return buildRow([String(household.id), household.name]);
  });
  renderTable(HOUSEHOLDS_TABLE_ID, rows);
}

/**
 * Role: Render the people table.
 * Inputs: None.
 * Outputs: None.
 * Errors: None.
 */
function renderPersons() {
  const rows = state.persons.map((person) => {
    const name = `${person.first_name} ${person.last_name}`;
    return buildRow([
      String(person.id),
      person.household_name,
      name,
    ]);
  });
  renderTable(PERSONS_TABLE_ID, rows);
}

/**
 * Role: Render the vehicles table.
 * Inputs: None.
 * Outputs: None.
 * Errors: None.
 */
function renderVehicles() {
  const rows = state.vehicles.map((vehicle) => {
    return buildRow([
      String(vehicle.id),
      vehicle.person_name,
      vehicle.name,
      String(vehicle.power_cv),
    ]);
  });
  renderTable(VEHICLES_TABLE_ID, rows);
}

/**
 * Role: Render the mileage scale table.
 * Inputs: None.
 * Outputs: None.
 * Errors: None.
 */
function renderMileageScale() {
  const rows = [];
  state.mileageScale.forEach((scale) => {
    scale.brackets.forEach((bracket) => {
      const maxKm = bracket.max_km === null ? "Au-delà" : bracket.max_km;
      rows.push(
        buildRow([
          String(scale.power_cv),
          String(maxKm),
          bracket.rate.toFixed(3),
          bracket.fixed.toFixed(2),
        ])
      );
    });
  });
  if (rows.length === 0) {
    rows.push(buildEmptyRow("Aucun barème", 4));
  }
  renderTable(MILEAGE_SCALE_TABLE_ID, rows);
}

/**
 * Role: Render the mileage entries table.
 * Inputs: None.
 * Outputs: None.
 * Errors: None.
 */
function renderMileageEntries() {
  const rows = state.details.mileage.map((entry) => {
    const menu = buildMenuCell("mileage", entry.id);
    return buildRow([
      String(entry.month),
      entry.vehicle_name,
      entry.km.toFixed(1),
      menu,
    ]);
  });
  if (rows.length === 0) {
    rows.push(buildEmptyRow("Aucun trajet", 4));
  }
  renderTable(MILEAGE_TABLE_ID, rows);
}

/**
 * Role: Render the meal entries table.
 * Inputs: None.
 * Outputs: None.
 * Errors: None.
 */
function renderMealEntries() {
  const rows = state.details.meals.map((entry) => {
    const menu = buildMenuCell("meal", entry.id);
    return buildRow([
      String(entry.month),
      entry.meal_cost.toFixed(2),
      entry.deductible_amount.toFixed(2),
      menu,
    ]);
  });
  if (rows.length === 0) {
    rows.push(buildEmptyRow("Aucun repas", 4));
  }
  renderTable(MEAL_TABLE_ID, rows);
}

/**
 * Role: Render the other expenses table.
 * Inputs: None.
 * Outputs: None.
 * Errors: None.
 */
function renderOtherEntries() {
  const rows = state.details.other.map((entry) => {
    const menu = buildMenuCell("other", entry.id);
    return buildRow([
      entry.description,
      entry.amount.toFixed(2),
      entry.attachment_path || "-",
      menu,
    ]);
  });
  if (rows.length === 0) {
    rows.push(buildEmptyRow("Aucun frais", 4));
  }
  renderTable(OTHER_TABLE_ID, rows);
}

/**
 * Role: Load admin reference data.
 * Inputs: None.
 * Outputs: None.
 * Errors: Sets status message on failure.
 */
async function loadAdminData() {
  setText(ADMIN_STATUS_ID, "Chargement des référentiels...");
  try {
    const [households, persons, vehicles, mileageScale] =
      await Promise.all([
        fetchJson(API_ENDPOINTS.households),
        fetchJson(API_ENDPOINTS.persons),
        fetchJson(API_ENDPOINTS.vehicles),
        fetchJson(API_ENDPOINTS.mileageScale),
      ]);
    state.households = households;
    state.persons = persons;
    state.vehicles = vehicles;
    state.mileageScale = mileageScale;
    renderHouseholds();
    renderPersons();
    renderVehicles();
    renderMileageScale();
    renderPersonSelect(persons);
    if (persons.length > 0) {
      renderVehicleSelect(persons[0].id, vehicles);
    }
    setText(ADMIN_STATUS_ID, "Référentiels chargés.");
  } catch (error) {
    setText(ADMIN_STATUS_ID, "Erreur de chargement.");
  }
}

/**
 * Role: Load detailed entries for a person.
 * Inputs: personId and year.
 * Outputs: None.
 * Errors: Sets status message on failure.
 */
async function loadPersonDetails(personId, year) {
  setText(ENTRY_STATUS_ID, "Chargement des frais...");
  try {
    const response = await fetchJson(
      `${API_ENDPOINTS.details}/${personId}/details/${year}`
    );
    state.details.mileage = response.mileage_entries;
    state.details.meals = response.meal_expenses;
    state.details.other = response.other_expenses;
    renderMileageEntries();
    renderMealEntries();
    renderOtherEntries();
    setText(ENTRY_STATUS_ID, "Frais chargés.");
  } catch (error) {
    setText(ENTRY_STATUS_ID, "Impossible de charger les frais.");
  }
}

/**
 * Role: Add a mileage entry.
 * Inputs: Event from form submission.
 * Outputs: None.
 * Errors: Shows status on failure.
 */
async function handleMileageAdd(event) {
  event.preventDefault();
  try {
    const personId = getSelectedPersonId();
    const year = getSelectedYear();
    const vehicleId = Number.parseInt(
      getElement("mileage-vehicle").value,
      10
    );
    const month = Number.parseInt(
      getElement("mileage-month").value,
      10
    );
    const km = Number.parseFloat(
      getElement("mileage-km").value
    );
    if (!Number.isFinite(vehicleId) || !Number.isFinite(month)) {
      throw new Error("Valeurs invalides");
    }
    if (!Number.isFinite(km)) {
      throw new Error("Valeurs invalides");
    }
    await fetchJson(API_ENDPOINTS.mileage, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        person_id: personId,
        vehicle_id: vehicleId,
        year,
        month,
        km,
      }),
    });
    await loadPersonDetails(personId, year);
    event.target.reset();
  } catch (error) {
    setText(ENTRY_STATUS_ID, "Erreur lors de l'ajout du trajet.");
  }
}

/**
 * Role: Add a meal entry.
 * Inputs: Event from form submission.
 * Outputs: None.
 * Errors: Shows status on failure.
 */
async function handleMealAdd(event) {
  event.preventDefault();
  try {
    const personId = getSelectedPersonId();
    const year = getSelectedYear();
    const month = Number.parseInt(
      getElement("meal-month").value,
      10
    );
    const mealCost = Number.parseFloat(
      getElement("meal-cost").value
    );
    if (!Number.isFinite(month) || !Number.isFinite(mealCost)) {
      throw new Error("Valeurs invalides");
    }
    await fetchJson(API_ENDPOINTS.meals, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        person_id: personId,
        year,
        month,
        meal_cost: mealCost,
      }),
    });
    await loadPersonDetails(personId, year);
    event.target.reset();
  } catch (error) {
    setText(ENTRY_STATUS_ID, "Erreur lors de l'ajout du repas.");
  }
}

/**
 * Role: Add an other expense entry.
 * Inputs: Event from form submission.
 * Outputs: None.
 * Errors: Shows status on failure.
 */
async function handleOtherAdd(event) {
  event.preventDefault();
  try {
    const personId = getSelectedPersonId();
    const year = getSelectedYear();
    const description =
      getElement("other-description").value.trim();
    const amount = Number.parseFloat(
      getElement("other-amount").value
    );
    const attachment =
      getElement("other-attachment").value.trim();
    if (!description || !Number.isFinite(amount)) {
      throw new Error("Valeurs invalides");
    }
    await fetchJson(API_ENDPOINTS.otherExpenses, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        person_id: personId,
        year,
        description,
        amount,
        attachment_path: attachment || null,
      }),
    });
    await loadPersonDetails(personId, year);
    event.target.reset();
  } catch (error) {
    setText(ENTRY_STATUS_ID, "Erreur lors de l'ajout du frais.");
  }
}

/**
 * Role: Open the mileage edit dialog with data.
 * Inputs: entryId.
 * Outputs: None.
 * Errors: None.
 */
function openMileageEdit(entryId) {
  const entry = state.details.mileage.find((item) => item.id === entryId);
  if (!entry) {
    return;
  }
  getElement("mileage-edit-id").value = String(entry.id);
  getElement("mileage-edit-month").value = String(entry.month);
  getElement("mileage-edit-km").value = String(entry.km);
  getElement("mileage-edit-vehicle").value = String(entry.vehicle_id);
  const dialog = getElement(MILEAGE_EDIT_DIALOG_ID);
  if (dialog instanceof HTMLDialogElement && !dialog.open) {
    dialog.showModal();
  }
}

/**
 * Role: Open the meal edit dialog with data.
 * Inputs: entryId.
 * Outputs: None.
 * Errors: None.
 */
function openMealEdit(entryId) {
  const entry = state.details.meals.find((item) => item.id === entryId);
  if (!entry) {
    return;
  }
  getElement("meal-edit-id").value = String(entry.id);
  getElement("meal-edit-month").value = String(entry.month);
  getElement("meal-edit-cost").value = String(entry.meal_cost);
  const dialog = getElement(MEAL_EDIT_DIALOG_ID);
  if (dialog instanceof HTMLDialogElement && !dialog.open) {
    dialog.showModal();
  }
}

/**
 * Role: Open the other expense edit dialog with data.
 * Inputs: entryId.
 * Outputs: None.
 * Errors: None.
 */
function openOtherEdit(entryId) {
  const entry = state.details.other.find((item) => item.id === entryId);
  if (!entry) {
    return;
  }
  getElement("other-edit-id").value = String(entry.id);
  getElement("other-edit-description").value = entry.description;
  getElement("other-edit-amount").value = String(entry.amount);
  getElement("other-edit-attachment").value =
    entry.attachment_path || "";
  const dialog = getElement(OTHER_EDIT_DIALOG_ID);
  if (dialog instanceof HTMLDialogElement && !dialog.open) {
    dialog.showModal();
  }
}

/**
 * Role: Update a mileage entry.
 * Inputs: Event from form submission.
 * Outputs: None.
 * Errors: Updates status message on failure.
 */
async function handleMileageEdit(event) {
  event.preventDefault();
  try {
    const personId = getSelectedPersonId();
    const year = getSelectedYear();
    const entryId = Number.parseInt(
      getElement("mileage-edit-id").value,
      10
    );
    const vehicleId = Number.parseInt(
      getElement("mileage-edit-vehicle").value,
      10
    );
    const month = Number.parseInt(
      getElement("mileage-edit-month").value,
      10
    );
    const km = Number.parseFloat(
      getElement("mileage-edit-km").value
    );
    if (!Number.isFinite(entryId)) {
      throw new Error("Entrée invalide");
    }
    await fetchJson(`${API_ENDPOINTS.mileage}/${entryId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        person_id: personId,
        vehicle_id: vehicleId,
        year,
        month,
        km,
      }),
    });
    await loadPersonDetails(personId, year);
    closeDialog(MILEAGE_EDIT_DIALOG_ID);
  } catch (error) {
    setText(ENTRY_STATUS_ID, "Erreur lors de la modification.");
  }
}

/**
 * Role: Update a meal entry.
 * Inputs: Event from form submission.
 * Outputs: None.
 * Errors: Updates status message on failure.
 */
async function handleMealEdit(event) {
  event.preventDefault();
  try {
    const personId = getSelectedPersonId();
    const year = getSelectedYear();
    const entryId = Number.parseInt(
      getElement("meal-edit-id").value,
      10
    );
    const month = Number.parseInt(
      getElement("meal-edit-month").value,
      10
    );
    const mealCost = Number.parseFloat(
      getElement("meal-edit-cost").value
    );
    if (!Number.isFinite(entryId)) {
      throw new Error("Entrée invalide");
    }
    await fetchJson(`${API_ENDPOINTS.meals}/${entryId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        person_id: personId,
        year,
        month,
        meal_cost: mealCost,
      }),
    });
    await loadPersonDetails(personId, year);
    closeDialog(MEAL_EDIT_DIALOG_ID);
  } catch (error) {
    setText(ENTRY_STATUS_ID, "Erreur lors de la modification.");
  }
}

/**
 * Role: Update an other expense entry.
 * Inputs: Event from form submission.
 * Outputs: None.
 * Errors: Updates status message on failure.
 */
async function handleOtherEdit(event) {
  event.preventDefault();
  try {
    const personId = getSelectedPersonId();
    const year = getSelectedYear();
    const entryId = Number.parseInt(
      getElement("other-edit-id").value,
      10
    );
    const description =
      getElement("other-edit-description").value.trim();
    const amount = Number.parseFloat(
      getElement("other-edit-amount").value
    );
    const attachment =
      getElement("other-edit-attachment").value.trim();
    if (!Number.isFinite(entryId) || !description) {
      throw new Error("Entrée invalide");
    }
    await fetchJson(`${API_ENDPOINTS.otherExpenses}/${entryId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        person_id: personId,
        year,
        description,
        amount,
        attachment_path: attachment || null,
      }),
    });
    await loadPersonDetails(personId, year);
    closeDialog(OTHER_EDIT_DIALOG_ID);
  } catch (error) {
    setText(ENTRY_STATUS_ID, "Erreur lors de la modification.");
  }
}

/**
 * Role: Delete an entry after confirmation.
 * Inputs: entryType and entryId.
 * Outputs: None.
 * Errors: Updates status message on failure.
 */
async function deleteEntry(entryType, entryId) {
  const confirmed = window.confirm(
    "Confirmer la suppression de cet enregistrement ?"
  );
  if (!confirmed) {
    return;
  }
  try {
    const personId = getSelectedPersonId();
    const year = getSelectedYear();
    const endpointMap = {
      mileage: API_ENDPOINTS.mileage,
      meal: API_ENDPOINTS.meals,
      other: API_ENDPOINTS.otherExpenses,
    };
    const endpoint = endpointMap[entryType];
    if (!endpoint) {
      throw new Error("Type invalide");
    }
    await fetchJson(`${endpoint}/${entryId}`, {
      method: "DELETE",
    });
    await loadPersonDetails(personId, year);
  } catch (error) {
    setText(ENTRY_STATUS_ID, "Erreur lors de la suppression.");
  }
}

/**
 * Role: Close a dialog by id.
 * Inputs: dialogId string.
 * Outputs: None.
 * Errors: None.
 */
function closeDialog(dialogId) {
  const dialog = getElement(dialogId);
  if (dialog instanceof HTMLDialogElement && dialog.open) {
    dialog.close();
  }
}

/**
 * Role: Handle menu actions from the tables.
 * Inputs: action, entry type, entry id.
 * Outputs: None.
 * Errors: None.
 */
function handleMenuAction(action, entryType, entryId) {
  if (action === "edit") {
    if (entryType === "mileage") {
      openMileageEdit(entryId);
    }
    if (entryType === "meal") {
      openMealEdit(entryId);
    }
    if (entryType === "other") {
      openOtherEdit(entryId);
    }
  }
  if (action === "delete") {
    deleteEntry(entryType, entryId);
  }
}

/**
 * Role: Handle global click events for menu actions.
 * Inputs: click event.
 * Outputs: None.
 * Errors: None.
 */
function handleGlobalClick(event) {
  const target = event.target;
  if (!(target instanceof HTMLElement)) {
    return;
  }
  const menuFor = target.dataset.menuFor;
  if (menuFor) {
    toggleMenu(menuFor);
    return;
  }
  const action = target.dataset.action;
  if (action) {
    const entryType = target.dataset.entryType;
    const entryId = Number.parseInt(
      target.dataset.entryId || "",
      10
    );
    if (entryType && Number.isFinite(entryId)) {
      closeAllMenus();
      handleMenuAction(action, entryType, entryId);
    }
    return;
  }
  closeAllMenus();
}

/**
 * Role: Register dialog close handlers.
 * Inputs: None.
 * Outputs: None.
 * Errors: None.
 */
function bindDialogClose() {
  document.querySelectorAll("[data-dialog-close]").forEach((button) => {
    button.addEventListener("click", () => {
      const dialog = button.closest("dialog");
      if (dialog instanceof HTMLDialogElement && dialog.open) {
        dialog.close();
      }
    });
  });
}

/**
 * Role: Refresh entry tables based on current selection.
 * Inputs: None.
 * Outputs: None.
 * Errors: Updates status on failure.
 */
async function refreshEntryTables() {
  try {
    const personId = getSelectedPersonId();
    const year = getSelectedYear();
    renderVehicleSelect(personId, state.vehicles);
    await loadPersonDetails(personId, year);
  } catch (error) {
    setText(ENTRY_STATUS_ID, "Sélection invalide.");
  }
}

/**
 * Role: Initialize the admin page.
 * Inputs: None.
 * Outputs: None.
 * Errors: None.
 */
function initializeAdmin() {
  getElement(ADMIN_REFRESH_ID).addEventListener("click", loadAdminData);
  getElement(ENTRY_REFRESH_ID).addEventListener("click", refreshEntryTables);
  getElement(MILEAGE_ADD_FORM_ID).addEventListener(
    "submit",
    handleMileageAdd
  );
  getElement(MEAL_ADD_FORM_ID).addEventListener("submit", handleMealAdd);
  getElement(OTHER_ADD_FORM_ID).addEventListener("submit", handleOtherAdd);
  getElement("mileage-edit-form").addEventListener(
    "submit",
    handleMileageEdit
  );
  getElement("meal-edit-form").addEventListener(
    "submit",
    handleMealEdit
  );
  getElement("other-edit-form").addEventListener(
    "submit",
    handleOtherEdit
  );
  getElement(PERSON_SELECT_ID).addEventListener(
    "change",
    refreshEntryTables
  );
  document.addEventListener("click", handleGlobalClick);
  bindDialogClose();
  loadAdminData().then(() => {
    if (state.persons.length > 0) {
      refreshEntryTables();
    }
  });
}

initializeAdmin();
