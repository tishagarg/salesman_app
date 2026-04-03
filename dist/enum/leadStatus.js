"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Source = exports.leadStatusColors = exports.LeadStatus = void 0;
var LeadStatus;
(function (LeadStatus) {
    LeadStatus["Prospect"] = "Prospect";
    LeadStatus["Signed"] = "Signed";
    LeadStatus["Hot_Lead"] = "Hot Lead";
    LeadStatus["Start_Signing"] = "Start Signing";
    LeadStatus["Meeting"] = "Meeting";
    LeadStatus["Not_Interested"] = "Not Interested";
    LeadStatus["Not_Available"] = "Not Available";
    LeadStatus["Get_Back"] = "Get Back";
})(LeadStatus || (exports.LeadStatus = LeadStatus = {}));
exports.leadStatusColors = {
    [LeadStatus.Prospect]: { name: "Orange", hex: "#FB9D4A" }, // Light orange
    [LeadStatus.Signed]: { name: "Green", hex: "#1b871b" }, // Light green
    [LeadStatus.Hot_Lead]: { name: "Purple", hex: "#B57FB5" }, // Light purple
    [LeadStatus.Start_Signing]: { name: "Light Blue", hex: "#2ed9f0" }, // Light light blue
    [LeadStatus.Meeting]: { name: "Blue", hex: "#1d43f0" }, // Light blue
    [LeadStatus.Not_Interested]: { name: "Red", hex: "#F94E5E" }, // Light red
    [LeadStatus.Not_Available]: { name: "Yellow", hex: "#aba418" }, // Light yellow
    [LeadStatus.Get_Back]: { name: "Pink", hex: "#db537e" }, // Light orange
};
var Source;
(function (Source) {
    Source["Manual"] = "Manual";
    Source["Excel"] = "Excel";
    Source["Email"] = "Email";
})(Source || (exports.Source = Source = {}));
