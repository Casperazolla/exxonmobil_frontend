export const ESD_LIBRARY = [

  // Hydrodynamic Upgrades
  { id: "esd-001", name: "Premium Hull Paint", category: "HULL", saving: 2.3, capex: 100000 , lead_time_months: 6, installation_req: "docking" },
  { id: "esd-002", name: "Propeller Boss Cap Fins", category: "HULL", saving: 1.5, capex: 50000 , lead_time_months: 6, installation_req: "docking" },
  { id: "esd-003", name: "Optimized Propeller", category: "HULL", saving: 4.2, capex: 250000 , lead_time_months: 6, installation_req: "docking" },
  { id: "esd-004", name: "Pre - Swirl Device", category: "HULL", saving: 3.3, capex: 150000 , lead_time_months: 6, installation_req: "docking" },
  { id: "esd-005", name: "Ultrasonic Propeller Protection", category: "HULL", saving: 1.2, capex: 80000 , lead_time_months: 4, installation_req: "in_sailing" },
  { id: "esd-006", name: "Hull Air Lubrication", category: "HULL", saving: 2.8, capex: 180000 , lead_time_months: 4, installation_req: "in_sailing" },
  { id: "esd-007", name: "Redesigned Bulbous Bow", category: "HULL", saving: 2.0, capex: 140000 , lead_time_months: 6, installation_req: "docking" },
  { id: "esd-008", name: "Trim Optimization", category: "HULL", saving: 2.1, capex: 50000 , lead_time_months: 4, installation_req: "in_sailing" },
  { id: "esd-009", name: "Hull Air Cavity", category: "HULL", saving: 2.5, capex: 220000 , lead_time_months: 4, installation_req: "in_sailing" },
  { id: "esd-010", name: "Wind Deflector", category: "HULL", saving: 1.4, capex: 70000 , lead_time_months: 4, installation_req: "in_sailing" },
  { id: "esd-011", name: "Kite Sails", category: "HULL", saving: 6.5, capex: 450000 , lead_time_months: 4, installation_req: "in_sailing" },
  { id: "esd-012", name: "Wind Sails", category: "HULL", saving: 5.8, capex: 420000 , lead_time_months: 4, installation_req: "in_sailing" },
  { id: "esd-013", name: "Rotor Sails", category: "HULL", saving: 7.2, capex: 500000 , lead_time_months: 4, installation_req: "in_sailing" },

  // Thermodynamic
  { id: "esd-014", name: "Ultra-Low Leakage Valves", category: "OPERATIONS", saving: 1.8, capex: 60000 , lead_time_months: 4, installation_req: "in_sailing" },
  { id: "esd-015", name: "Waste Heat Recovery Systems (WHR)", category: "OPERATIONS", saving: 5.2, capex: 350000 , lead_time_months: 4, installation_req: "in_sailing" },
  { id: "esd-016", name: "Organic Rankine Cycle (E-Propulsion)", category: "OPERATIONS", saving: 4.4, capex: 400000 , lead_time_months: 4, installation_req: "in_sailing" },
  { id: "esd-017", name: "Liquid Carbon Capture", category: "OPERATIONS", saving: 8.0, capex: 900000 , lead_time_months: 4, installation_req: "in_sailing" },
  { id: "esd-018", name: "Solid Carbon Capture", category: "OPERATIONS", saving: 7.5, capex: 850000 , lead_time_months: 4, installation_req: "in_sailing" },

  // Main Engine
  { id: "esd-019", name: "ME Operational Power Optimization", category: "ENGINE", saving: 3.5, capex: 200000 , lead_time_months: 4, installation_req: "in_sailing" },
  { id: "esd-020", name: "Turbocharger Cut-Off", category: "ENGINE", saving: 2.4, capex: 180000 , lead_time_months: 4, installation_req: "in_sailing" },
  { id: "esd-021", name: "Fuel Additives", category: "ENGINE", saving: 1.2, capex: 30000 , lead_time_months: 4, installation_req: "in_sailing" },
  { id: "esd-022", name: "Fuel Additive (for DF engine)", category: "ENGINE", saving: 2.9, capex: 150000 , lead_time_months: 4, installation_req: "in_sailing" },
  { id: "esd-023", name: "ME SFOC Optimization", category: "ENGINE", saving: 2.9, capex: 150000 , lead_time_months: 4, installation_req: "in_sailing" },
  { id: "esd-024", name: "Fine Filters AE", category: "ENGINE", saving: 1.4, capex: 40000 , lead_time_months: 4, installation_req: "in_sailing" },
    { id: "esd-025", name: "Fine Filters ME", category: "ENGINE", saving: 1.4, capex: 40000 , lead_time_months: 4, installation_req: "in_sailing" },

  { id: "esd-026", name: "Turbocharger Renewal", category: "ENGINE", saving: 2.8, capex: 210000 , lead_time_months: 4, installation_req: "in_sailing" },
    { id: "esd-027", name: "Electric Heaters", category: "ENGINE", saving: 10, capex: 40000 , lead_time_months: 4, installation_req: "in_sailing" },


  // Electrical
  { id: "esd-028", name: "Autopilot Upgrade", category: "AUXILIARY", saving: 1.8, capex: 120000 , lead_time_months: 4, installation_req: "in_sailing" },
  { id: "esd-029", name: "Variable Frequency Drive", category: "AUXILIARY", saving: 0.8, capex: 180000 , lead_time_months: 4, installation_req: "in_sailing" },
  { id: "esd-030", name: "Continuous Emissions Monitoring System", category: "AUXILIARY", saving: 0.7, capex: 100000 , lead_time_months: 4, installation_req: "in_sailing" },
  { id: "esd-031", name: "Marine LED Lights (Regular)", category: "AUXILIARY", saving: 0.9, capex: 80000 , lead_time_months: 4, installation_req: "in_sailing" },
  { id: "esd-032", name: "Marine LED Lights (Smart)", category: "AUXILIARY", saving: 1.2, capex: 120000 , lead_time_months: 4, installation_req: "in_sailing" },
  { id: "esd-033", name: "ENPOSS", category: "AUXILIARY", saving: 1.7, capex: 250000 , lead_time_months: 4, installation_req: "in_sailing" },
  { id: "esd-034", name: "Shaft Generators", category: "AUXILIARY", saving: 2.6, capex: 350000 , lead_time_months: 4, installation_req: "in_sailing" },
  { id: "esd-035", name: "Ship Performance Management", category: "AUXILIARY", saving: 2.0, capex: 180000 , lead_time_months: 4, installation_req: "in_sailing" },
  { id: "esd-036", name: "Marine Solar Panels", category: "AUXILIARY", saving: 1.5, capex: 300000 , lead_time_months: 4, installation_req: "in_sailing" },
  { id: "esd-037", name: "PEM Fuel Cells", category: "AUXILIARY", saving: 5.5, capex: 1200000 , lead_time_months: 4, installation_req: "in_sailing" },
  { id: "esd-038", name: "Alternate Shore Power", category: "AUXILIARY", saving: 3.8, capex: 450000 , lead_time_months: 4, installation_req: "in_sailing" },
];