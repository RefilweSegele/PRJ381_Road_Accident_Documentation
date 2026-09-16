function CaseEntryForm() {
    return (
        <div className="case-entry-form">
            <h2>New Accident Case</h2>
            <form>
                <div>
                    <div>
                        <label htmlFor="location">Location</label>
                        <input type="text" id="location" placeholder="eg. N1 Highway, Midrand" />
                    </div>
                    <div>
                        <label htmlFor="date">Date of Incident</label>
                        <input type="date" id="date" name="date"/>
                    </div>
                    <div>
                        <label htmlFor="flightAltitude">Drone Flight Altitude (m)</label>
                        <input type="number" id="flightAltitude" name="flightAltitude" />
                    </div>
                    <div>
                        <label htmlFor="flightSpeed">Drone Flight Speed (m/s)</label>
                        <input type="number" id="flightSpeed" name="flightSpeed" />
                    </div>
                    <div>
                        <label htmlFor="notes">Additional Notes</label>
                        <textarea id="notes" name="notes"></textarea> 
                    </div>
                    <button type="submit">Submit Case</button>
                </div>
            </form>
        </div>
    )
}

export default CaseEntryForm