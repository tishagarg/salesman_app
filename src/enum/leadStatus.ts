export enum LeadStatus {
  Prospect = "Prospect",
  Signed = "Signed",
  Hot_Lead = "Hot Lead",
  Start_Signing = "Start Signing",
  Meeting = "Meeting",
  Not_Interested = "Not Interested",
  Not_Available = "Not Available",
  Get_Back = "Get Back",
}
export const leadStatusColors: Record<LeadStatus, { name: string; hex: string }> = {
  [LeadStatus.Prospect]: { name: "Orange", hex: "#FB9D4A" }, // Light orange
  [LeadStatus.Signed]: { name: "Green", hex: "#1b871b" },   // Light green
  [LeadStatus.Hot_Lead]: { name: "Purple", hex: "#B57FB5" }, // Light purple
  [LeadStatus.Start_Signing]: { name: "Light Blue", hex: "#2ed9f0" }, // Light light blue
  [LeadStatus.Meeting]: { name: "Blue", hex: "#1d43f0" },   // Light blue
  [LeadStatus.Not_Interested]: { name: "Red", hex: "#F94E5E" }, // Light red
  [LeadStatus.Not_Available]: { name: "Yellow", hex: "#aba418" }, // Light yellow
  [LeadStatus.Get_Back]: { name: "Orange", hex: "#FB9D4A" }, // Light orange
};


export enum Source {
  Manual = "Manual",
  Excel = "Excel",
  Email = "Email",
}