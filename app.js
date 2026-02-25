/**
 * State Management and Wizard Logic for Krankengeldzuschuss-Assistent
 */

// Application State
const state = {
    currentStep: 0,
    data: {
        tarifgruppe: null,
        sozialleistung: null,
        beschaeftigungsart: null, // 'arbeiter', 'angestellter'
        beschaeftigungsbeginn: null,
        letzter_tag_ef: null,
        berechnungs_variante: null, // 'einzel', 'mehrfach'
        daily_gross_benefit: 0,
        daily_net_benefit: 0,
        unst_bestandteile: null, // 'ja', 'nein'
        ausgefallene_tage: 0,
        au_beginn_datum: null,
        netto_urlaubsverguetung: 0,
        arbeitszeit_individuell: 0,
        arbeitszeit_vollzeit: 0,
        vl_arbeitgeberanteil: null // 'ja', 'nein'
    }
};

// Wizard Steps Definition
const steps = [
    {
        id: 'start',
        title: 'Krankengeldzuschuss nach TV TgDRV',
        description: 'Dieser Assistent hilft Ihnen bei der Ermittlung Ihres Anspruchs auf Krankengeldzuschuss gemäß Tarifvertrag Tarifgemeinschaft Deutsche Rentenversicherung (§ 22 TV TgDRV).',
        content: `
            <div class="info-card">
                <h4>Hinweis</h4>
                <p>Bitte halten Sie für die Beantwortung der Fragen folgende Informationen bereit:</p>
                <ul style="margin-top: 0.5rem; margin-left: 1.5rem; color: var(--text-secondary);">
                    <li>Das Datum Ihres Beschäftigungsbeginns</li>
                    <li>Das Datum des Beginns Ihrer Arbeitsunfähigkeit (AU)</li>
                </ul>
            </div>
        `,
        validate: () => true
    },
    {
        id: 'tarifgruppe',
        title: 'Art des Beschäftigungsverhältnisses',
        description: 'Unter welche Gruppe fällt Ihr aktuelles Arbeitsverhältnis?',
        content: `
            <div class="options-group">
                <label class="option-card" data-val="regulär">
                    <input type="radio" name="tg" value="regulär">
                    <div class="option-content">
                        <strong>Regulär Beschäftigte/r</strong>
                        <p style="font-size: 0.85rem; color: var(--text-secondary);">Festanstellung, Vollzeit oder Teilzeit.</p>
                    </div>
                </label>
                <label class="option-card" data-val="azubi">
                    <input type="radio" name="tg" value="azubi">
                    <div class="option-content">
                        <strong>Auszubildende / Praktikanten</strong>
                        <p style="font-size: 0.85rem; color: var(--text-secondary);">Azubis, Werkstudierende, Praktikanten.</p>
                    </div>
                </label>
            </div>
        `,
        onRender: () => {
            const cards = document.querySelectorAll('.option-card');
            cards.forEach(card => {
                const val = card.getAttribute('data-val');
                if (state.data.tarifgruppe === val) {
                    card.classList.add('selected');
                    card.querySelector('input').checked = true;
                }
                card.onclick = () => {
                    cards.forEach(c => c.classList.remove('selected'));
                    card.classList.add('selected');
                    card.querySelector('input').checked = true;
                    state.data.tarifgruppe = val;
                };
            });
        },
        validate: () => {
            if (!state.data.tarifgruppe) return false;
            if (state.data.tarifgruppe === 'azubi') {
                showIneligible("Auszubildende, Praktikanten und Werkstudierende fallen nicht unter den Geltungsbereich des § 22 TV TgDRV hinsichtlich des Krankengeldzuschusses.");
                return false;
            }
            return true;
        }
    },
    {
        id: 'leistungsanspruch',
        title: 'Anspruch auf Entgeltersatzleistung',
        description: 'Haben Sie nach Ablauf der 6-wöchigen Entgeltfortzahlung Anspruch auf Krankengeld oder eine entsprechende gesetzliche Leistung?',
        content: `
            <div class="options-group">
                <label class="option-card" data-val="ja">
                    <input type="radio" name="sl" value="ja">
                    <div class="option-content">
                        <strong>Ja</strong>
                        <p style="font-size: 0.85rem; color: var(--text-secondary);">Ich bin sozialversicherungspflichtig beschäftigt (Krankengeld-Anspruch).</p>
                    </div>
                </label>
                <label class="option-card" data-val="nein">
                    <input type="radio" name="sl" value="nein">
                    <div class="option-content">
                        <strong>Nein</strong>
                        <p style="font-size: 0.85rem; color: var(--text-secondary);">Z.B. Minijob (geringfügig beschäftigt) ohne eigenen Krankengeld-Anspruch.</p>
                    </div>
                </label>
            </div>
        `,
        onRender: () => {
            const cards = document.querySelectorAll('.option-card');
            cards.forEach(card => {
                const val = card.getAttribute('data-val');
                if (state.data.sozialleistung === val) {
                    card.classList.add('selected');
                    card.querySelector('input').checked = true;
                }
                card.onclick = () => {
                    cards.forEach(c => c.classList.remove('selected'));
                    card.classList.add('selected');
                    card.querySelector('input').checked = true;
                    state.data.sozialleistung = val;
                };
            });
        },
        validate: () => {
            if (!state.data.sozialleistung) return false;
            if (state.data.sozialleistung === 'nein') {
                showIneligible("Ein Krankengeldzuschuss setzt gemäß § 22 Abs. 2 TV TgDRV voraus, dass dem/der Beschäftigten Krankengeld oder entsprechende gesetzliche Leistungen gezahlt werden. Bei Minijobs ohne Krankengeldanspruch besteht daher kein Zuschussanspruch.");
                return false;
            }
            return true;
        }
    },
    {
        id: 'beschaeftigungsart',
        title: 'Beschäftigungsverhältnis',
        description: 'Sind Sie als Arbeiter oder als Angestellter beschäftigt?',
        content: `
            <div class="options-group">
                <label class="option-card" data-val="arbeiter">
                    <input type="radio" name="ba" value="arbeiter">
                    <div class="option-content">
                        <strong>Arbeiter/in</strong>
                        <p style="font-size: 0.85rem; color: var(--text-secondary);">Gilt sofort als Neufall.</p>
                    </div>
                </label>
                <label class="option-card" data-val="angestellter">
                    <input type="radio" name="ba" value="angestellter">
                    <div class="option-content">
                        <strong>Angestellte/r</strong>
                        <p style="font-size: 0.85rem; color: var(--text-secondary);">Unterscheidung Alt-/Neufall erfolgt nach Eintrittsdatum.</p>
                    </div>
                </label>
            </div>
        `,
        onRender: () => {
            const cards = document.querySelectorAll('.option-card');
            cards.forEach(card => {
                const val = card.getAttribute('data-val');
                if (state.data.beschaeftigungsart === val) {
                    card.classList.add('selected');
                    card.querySelector('input').checked = true;
                }
                card.onclick = () => {
                    cards.forEach(c => c.classList.remove('selected'));
                    card.classList.add('selected');
                    card.querySelector('input').checked = true;
                    state.data.beschaeftigungsart = val;
                };
            });
        },
        validate: () => {
            if (!state.data.beschaeftigungsart) return false;
            return true;
        }
    },
    {
        id: 'beschaeftigung',
        title: 'Beschäftigungsbeginn',
        description: 'Wann wurde das aktuelle Beschäftigungsverhältnis bei diesem Arbeitgeber aufgenommen?',
        content: `
            <div class="input-group">
                <label class="input-label" for="date-start">Datum des Beschäftigungsbeginns</label>
                <input type="date" id="date-start" class="input-field" min="1900-01-01" required>
                <span class="error-message" id="error-date">Bitte geben Sie ein gültiges Datum ein.</span>
            </div>
            <div class="info-card">
                <p>Der Beschäftigungsbeginn ist wichtig zur Ermittlung Ihrer Beschäftigungszeit nach § 34 Abs. 3 TV TgDRV.</p>
            </div>
        `,
        onRender: () => {
            const input = document.getElementById('date-start');
            if (state.data.beschaeftigungsbeginn) {
                input.value = state.data.beschaeftigungsbeginn;
            }
            // Bind real-time validation to remote error early if user types
            input.addEventListener('input', () => {
                input.classList.remove('error');
                document.getElementById('error-date').style.display = 'none';
            });
        },
        validate: () => {
            const input = document.getElementById('date-start');
            const dateStr = input.value;
            if (!dateStr) {
                input.classList.add('error');
                document.getElementById('error-date').style.display = 'block';
                return false;
            }

            const year = new Date(dateStr).getFullYear();
            if (year < 1900 || year > 2100) {
                input.classList.add('error');
                const errorEl = document.getElementById('error-date');
                errorEl.textContent = 'Bitte geben Sie ein gültiges 4-stelliges Jahr ein (z.B. 2024).';
                errorEl.style.display = 'block';
                return false;
            }

            state.data.beschaeftigungsbeginn = dateStr;
            return true;
        }
    },
    {
        id: 'ef_ende',
        title: 'Letzter Tag der Entgeltfortzahlung',
        description: 'Bitte geben Sie den letzten Tag an, für den Ihr Arbeitgeber das Entgelt fortgezahlt hat (Ende der 6-Wochen-Frist).',
        content: `
            <div class="input-group">
                <label class="input-label" for="date-ef">Ende der Entgeltfortzahlung</label>
                <input type="date" id="date-ef" class="input-field" min="1900-01-01" required>
                <span class="error-message" id="error-ef">Bitte geben Sie ein gültiges Datum ein.</span>
            </div>
            <div class="info-card">
                <p>Ab dem darauffolgenden Tag beginnt grundsätzlich der Anspruch auf Krankengeldzuschuss.</p>
            </div>
        `,
        onRender: () => {
            const input = document.getElementById('date-ef');
            if (state.data.letzter_tag_ef) {
                input.value = state.data.letzter_tag_ef;
            }
            input.addEventListener('input', () => {
                input.classList.remove('error');
                document.getElementById('error-ef').style.display = 'none';
            });
        },
        validate: () => {
            const input = document.getElementById('date-ef');
            const dateStr = input.value;
            if (!dateStr) {
                input.classList.add('error');
                document.getElementById('error-ef').style.display = 'block';
                return false;
            }

            const year = new Date(dateStr).getFullYear();
            if (year < 1900 || year > 2100) {
                input.classList.add('error');
                const errorEl = document.getElementById('error-ef');
                errorEl.textContent = 'Bitte geben Sie ein gültiges 4-stelliges Jahr ein (z.B. 2024).';
                errorEl.style.display = 'block';
                return false;
            }

            state.data.letzter_tag_ef = dateStr;
            return true;
        }
    },
    {
        id: 'leistungsdaten',
        title: 'Leistungsdaten',
        description: 'Bitte geben Sie Ihre kalendertägliche Brutto- und Nettoentgeltersatzleistung an.',
        content: `
            <div class="input-group" style="margin-bottom: 1.5rem;">
                <label class="input-label" for="daily-gross">Tägliche Brutto-Leistung (€)</label>
                <input type="number" id="daily-gross" class="input-field" step="0.01" min="0" placeholder="0,00">
            </div>
            <div class="input-group">
                <label class="input-label" for="daily-net">Tägliche Netto-Leistung (€)</label>
                <input type="number" id="daily-net" class="input-field" step="0.01" min="0" placeholder="0,00">
            </div>
            <div class="info-card" style="margin-top: 1.5rem;">
                <p>Diese Werte finden Sie i.d.R. auf dem Bewilligungsbescheid Ihrer Krankenkasse.</p>
            </div>
        `,
        onRender: () => {
            document.getElementById('daily-gross').value = state.data.daily_gross_benefit || '';
            document.getElementById('daily-net').value = state.data.daily_net_benefit || '';
        },
        validate: () => {
            const gross = parseFloat(document.getElementById('daily-gross').value);
            const net = parseFloat(document.getElementById('daily-net').value);
            if (isNaN(gross) || isNaN(net)) return false;
            state.data.daily_gross_benefit = gross;
            state.data.daily_net_benefit = net;
            return true;
        }
    },
    {
        id: 'unst_bestandteile',
        title: 'Unständige Entgeltbestandteile',
        description: 'Haben Sie im Referenzzeitraum unständige Entgeltbestandteile (z.B. Zuschläge) bezogen?',
        content: `
            <div class="options-group" style="margin-bottom: 1.5rem;">
                <label class="option-card" data-val="ja">
                    <input type="radio" name="ub" value="ja">
                    <div class="option-content"><strong>Ja</strong></div>
                </label>
                <label class="option-card" data-val="nein">
                    <input type="radio" name="ub" value="nein">
                    <div class="option-content"><strong>Nein</strong></div>
                </label>
            </div>

            <div id="extra-fields" style="display: none; animation: slideDown 0.3s ease-out;">
                <div class="input-group" style="margin-bottom: 1.5rem;">
                    <label class="input-label" for="ausgefallene-tage">Ausgefallene Kalendertage (max. 31)</label>
                    <input type="number" id="ausgefallene-tage" class="input-field" min="0" max="31" value="0">
                </div>
                <div class="input-group">
                    <label class="input-label" for="beginn-au-unst">Beginn der Arbeitsunfähigkeit</label>
                    <input type="date" id="beginn-au-unst" class="input-field" min="1900-01-01">
                </div>
            </div>
        `,
        onRender: () => {
            const cards = document.querySelectorAll('.option-card');
            const extraFields = document.getElementById('extra-fields');

            cards.forEach(card => {
                const val = card.getAttribute('data-val');
                if (state.data.unst_bestandteile === val) {
                    card.classList.add('selected');
                    card.querySelector('input').checked = true;
                    if (val === 'ja') extraFields.style.display = 'block';
                }
                card.onclick = () => {
                    cards.forEach(c => c.classList.remove('selected'));
                    card.classList.add('selected');
                    card.querySelector('input').checked = true;
                    state.data.unst_bestandteile = val;

                    if (val === 'ja') {
                        extraFields.style.display = 'block';
                    } else {
                        extraFields.style.display = 'none';
                    }
                };
            });

            if (state.data.unst_bestandteile === 'ja') {
                document.getElementById('ausgefallene-tage').value = state.data.ausgefallene_tage || 0;
                document.getElementById('beginn-au-unst').value = state.data.au_beginn_datum || '';
            }
        },
        validate: () => {
            if (!state.data.unst_bestandteile) return false;
            if (state.data.unst_bestandteile === 'ja') {
                const tageInput = document.getElementById('ausgefallene-tage');
                const dateInput = document.getElementById('beginn-au-unst');
                const tage = parseInt(tageInput.value);
                const date = dateInput.value;

                if (isNaN(tage) || tage < 0 || tage > 31 || !date) {
                    return false;
                }

                const year = new Date(date).getFullYear();
                if (year < 1900 || year > 2100) {
                    dateInput.classList.add('error');
                    // Adding alert as fallback for this specific step which lacks a dedicated error span currently
                    alert('Bitte geben Sie ein gültiges 4-stelliges Jahr ein (1900-2100).');
                    return false;
                }

                state.data.ausgefallene_tage = tage;
                state.data.au_beginn_datum = date;
            }
            return true;
        }
    },
    {
        id: 'ergaenzende_angaben',
        title: 'Ergänzende Angaben',
        description: 'Bitte geben Sie Ihre Urlaubsvergütung, Arbeitszeit und VL-Informationen an.',
        content: `
            <div class="input-group" style="margin-bottom: 1.5rem;">
                <label class="input-label" for="combined-netto-urlaub">Nettourlaubsvergütung (€)</label>
                <input type="number" id="combined-netto-urlaub" class="input-field" step="0.01" min="0" placeholder="0,00">
            </div>

            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 1.5rem;">
                <div class="input-group">
                    <label class="input-label" for="combined-az-indiv">Indiv. Stunden</label>
                    <input type="number" id="combined-az-indiv" class="input-field" step="0.01" min="0" placeholder="z.B. 19,5">
                </div>
                <div class="input-group">
                    <label class="input-label" for="combined-az-voll">Vollzeit-Stunden</label>
                    <input type="number" id="combined-az-voll" class="input-field" step="0.01" min="0" placeholder="z.B. 39,0">
                </div>
            </div>

            <div class="input-group">
                <label class="input-label">Vermögenswirksame Leistungen (VL)</label>
                <p style="font-size: 0.85rem; color: var(--text-secondary); margin-bottom: 0.5rem;">Wird ein Arbeitgeberanteil zur VL gezahlt?</p>
                <div class="options-group" style="flex-direction: row; gap: 1rem;">
                    <label class="option-card" data-val="ja" style="flex: 1; padding: 0.75rem;">
                        <input type="radio" name="vl_combined" value="ja">
                        <div class="option-content" style="text-align: center;"><strong>Ja</strong></div>
                    </label>
                    <label class="option-card" data-val="nein" style="flex: 1; padding: 0.75rem;">
                        <input type="radio" name="vl_combined" value="nein">
                        <div class="option-content" style="text-align: center;"><strong>Nein</strong></div>
                    </label>
                </div>
            </div>
        `,
        onRender: () => {
            document.getElementById('combined-netto-urlaub').value = state.data.netto_urlaubsverguetung || '';
            document.getElementById('combined-az-indiv').value = state.data.arbeitszeit_individuell || '';
            document.getElementById('combined-az-voll').value = state.data.arbeitszeit_vollzeit || '';

            const cards = document.querySelectorAll('.option-card');
            cards.forEach(card => {
                const val = card.getAttribute('data-val');
                if (state.data.vl_arbeitgeberanteil === val) {
                    card.classList.add('selected');
                    card.querySelector('input').checked = true;
                }
                card.onclick = () => {
                    cards.forEach(c => c.classList.remove('selected'));
                    card.classList.add('selected');
                    card.querySelector('input').checked = true;
                    state.data.vl_arbeitgeberanteil = val;
                };
            });
        },
        validate: () => {
            const urlaub = parseFloat(document.getElementById('combined-netto-urlaub').value);
            const indiv = parseFloat(document.getElementById('combined-az-indiv').value);
            const voll = parseFloat(document.getElementById('combined-az-voll').value);

            if (isNaN(urlaub) || isNaN(indiv) || isNaN(voll) || !state.data.vl_arbeitgeberanteil) {
                return false;
            }

            state.data.netto_urlaubsverguetung = urlaub;
            state.data.arbeitszeit_individuell = indiv;
            state.data.arbeitszeit_vollzeit = voll;
            return true;
        }
    },
    {
        id: 'result',
        title: 'Zusammenfassung',
        description: 'Basierend auf Ihren Angaben hier eine erste Einschätzung.',
        content: `
            <div id="final-result-container">
               <!-- Filled dynamically -->
            </div>
            <div class="info-card" style="border-left-color: var(--success-color)">
                <h4>Bereitschaft zur Erweiterung</h4>
                <p>Weitere fachliche Fragen (Fristenlauf, Vorerkrankungen, Entgeltfortzahlung) können hier nahtlos integriert werden.</p>
            </div>
        `,
        onRender: () => {
            const container = document.getElementById('final-result-container');

            // 1. Employment Duration Calculation
            const startStr = state.data.beschaeftigungsbeginn;
            const efEndeStr = state.data.letzter_tag_ef;
            const start = new Date(startStr);
            const efEnde = new Date(efEndeStr);

            let diffYears = 0;
            let diffMonths = 0;

            if (!isNaN(start.getTime()) && !isNaN(efEnde.getTime())) {
                let years = efEnde.getFullYear() - start.getFullYear();
                let months = efEnde.getMonth() - start.getMonth();
                if (months < 0 || (months === 0 && efEnde.getDate() < start.getDate())) {
                    years--;
                    months += 12;
                }
                if (efEnde.getDate() < start.getDate()) {
                    months--;
                }
                diffYears = years;
                diffMonths = months < 0 ? 0 : months;
            }

            const totalMonths = (diffYears * 12) + diffMonths;

            // 2. Altfall/Neufall logic
            let istAltfall = false;
            if (state.data.beschaeftigungsart === 'angestellter' && !isNaN(start.getTime())) {
                const cutOffDate = new Date('1994-06-01');
                if (start < cutOffDate) {
                    istAltfall = true;
                }
            }

            // 3. Monetary Calculation (REVISED FOR USER REQUIREMENTS)
            // Neufall: Subtract Gross Benefit (* 30)
            // Altfall: Subtract Net Benefit (* 30)
            const dailyNetIst = state.data.daily_net_benefit || 0;
            const dailyGrossIst = state.data.daily_gross_benefit || 0;

            const benefitBase = istAltfall ? dailyNetIst : dailyGrossIst;
            const monthlyBenefit = benefitBase * 30;
            const monthlyNetUrlaub = state.data.netto_urlaubsverguetung || 0;

            // Teilergebnis 1
            const teilergebnis1 = Math.max(0, monthlyNetUrlaub - monthlyBenefit);

            // 4. VL Contribution
            let vlGrant = 0;
            if (state.data.vl_arbeitgeberanteil === 'ja') {
                const azIndiv = state.data.arbeitszeit_individuell || 0;
                const azVoll = state.data.arbeitszeit_vollzeit || 39;
                vlGrant = (6.65 / azVoll) * azIndiv;
            }

            const totalMonthlyGrant = teilergebnis1 + vlGrant;

            // 5. Determining Claim Duration
            let durationText = "";
            let alertType = "info";

            if (totalMonths < 12) {
                durationText = "Kein Anspruch (Beschäftigungszeit < 1 Jahr)";
                alertType = "warning";
            } else if (totalMonths >= 12 && totalMonths < 36) {
                durationText = "Bis zum Ende der 13. Woche";
            } else {
                durationText = "Bis zum Ende der 39. Woche";
            }

            // 6. Build HTML Result
            let html = `
                <div class="result-card">
                    <div class="result-header" style="background: ${alertType === 'warning' ? 'var(--error-color)' : 'var(--primary-color)'}">
                        <h3>Berechnungsergebnis</h3>
                        <p>${istAltfall ? 'Altfall (§ 71 BAT)' : 'Neufall (§ 22 TV TgDRV)'}</p>
                    </div>
                    
                    <div class="result-body">
                        <div class="result-main-value">
                            <span class="label">Mtl. Zuschuss (Gesamt)</span>
                            <span class="value">${totalMonthlyGrant.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}</span>
                        </div>
                        
                        <div class="result-details">
                            <div class="detail-row">
                                <span>Bezugsnorm (Nettourlaub):</span>
                                <strong>${monthlyNetUrlaub.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}</strong>
                            </div>
                            <div class="detail-row">
                                <span>Abzüglich ${istAltfall ? 'Netto' : 'Brutto'}-Krg. (x 30):</span>
                                <strong>- ${monthlyBenefit.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}</strong>
                            </div>
                            <div class="detail-row highlight" style="margin-bottom: 1.5rem;">
                                <span>Teilergebnis 1:</span>
                                <strong>${teilergebnis1.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}</strong>
                            </div>

                            <div class="detail-row">
                                <span>Arbeitgeberanteil zur VL:</span>
                                <strong>+ ${vlGrant.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}</strong>
                            </div>
                            <p style="font-size: 0.75rem; color: var(--text-secondary); margin-bottom: 1rem; padding-left: 1rem;">
                                ${state.data.vl_arbeitgeberanteil === 'ja' ? `Berechnet: (6,65 € / ${state.data.arbeitszeit_vollzeit}h) x ${state.data.arbeitszeit_individuell}h` : 'Nicht gezahlt'}
                            </p>
                        </div>

                        <div class="result-meta">
                            <div class="meta-item">
                                <span class="meta-label">Max. Bezugsdauer:</span>
                                <span class="meta-value">${durationText}</span>
                            </div>
                            <div class="meta-item">
                                <span class="meta-label">Beschäftigungszeit:</span>
                                <span class="meta-value">${diffYears} J., ${diffMonths} M.</span>
                            </div>
                        </div>
                    </div>
                </div>
            `;

            if (state.data.unst_bestandteile === 'ja') {
                html += `
                    <div class="info-card" style="margin-top: 1rem; border-left-color: var(--accent-color);">
                        <p style="font-size: 0.9rem;">
                            <strong>Hinweis zu unständigen Bestandteilen:</strong> Die ${state.data.ausgefallene_tage} ausgefallenen Tage und der Beginn am ${new Date(state.data.au_beginn_datum).toLocaleDateString('de-DE')} wurden erfasst. In dieser Version erfolgt die Zuschussberechnung basierend auf dem fixen Monatsnetto. Eine detaillierte Durchschnittsberechnung der Zuschläge ist für das nächste Update geplant.
                        </p>
                    </div>
                `;
            }

            // 7. Add Print Report Header & Summary for Printing
            const today = new Date().toLocaleDateString('de-DE');

            // Re-use summary logic to get a clean printable list of inputs
            let inputsHtml = '';
            if (state.data.beschaeftigungsbeginn) {
                inputsHtml += `
                    <div class="summary-row"><span class="summary-label">Eintrittsdatum:</span> <span>${new Date(state.data.beschaeftigungsbeginn).toLocaleDateString('de-DE')}</span></div>
                    <div class="summary-row"><span class="summary-label">Ende Entgeltfortzahlung:</span> <span>${new Date(state.data.letzter_tag_ef).toLocaleDateString('de-DE')}</span></div>
                    <div class="summary-row"><span class="summary-label">Beschäftigungszeit:</span> <span>${diffYears} J., ${diffMonths} M.</span></div>
                    <div class="summary-row"><span class="summary-label">Einstufung:</span> <span>${istAltfall ? 'Altfall (§ 71 BAT)' : 'Neufall (§ 22 TV TgDRV)'}</span></div>
                    <div class="summary-row"><span class="summary-label">Netto-Urlaubsentgelt:</span> <span>${monthlyNetUrlaub.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}</span></div>
                    <div class="summary-row"><span class="summary-label">Krg.-Satz (Brutto/Netto):</span> <span>${(state.data.daily_gross_benefit || 0).toFixed(2)}€ / ${(state.data.daily_net_benefit || 0).toFixed(2)}€</span></div>
                `;
            }

            let reportHtml = `
                <div class="print-report-header">
                    <h1>Berechnungsprotokoll: Krankengeldzuschuss</h1>
                    <div class="date">Erstellt am ${today}</div>
                </div>

                <div class="result-summary">
                    <h3>Erfasste Basisdaten</h3>
                    <div class="summary-content">
                        ${inputsHtml}
                    </div>
                </div>

                ${html}

                <div class="print-footer">
                    Dieses Dokument dient der Information und wurde automatisiert erstellt. 
                    Grundlage: TV TgDRV / § 71 BAT (Übergangsrecht).
                </div>

                <div style="text-align: center; margin-top: 2rem; display: flex; gap: 1rem; justify-content: center;">
                    <button id="btn-print" class="btn btn-secondary" style="display: flex; align-items: center; gap: 0.5rem;">
                        <svg width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M6 9V2h12v7M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2M6 14h12v8H6z"/></svg>
                        Ergebnisbericht drucken
                    </button>
                    <button class="btn btn-primary" onclick="window.location.reload()">Neu starten</button>
                </div>
            `;

            container.innerHTML = reportHtml;

            // Attach print event
            document.getElementById('btn-print').onclick = () => window.print();
        },
        validate: () => true
    }
];

// DOM Elements
const elements = {
    questionContainer: document.getElementById('question-container'),
    stepper: document.getElementById('stepper'),
    btnPrev: document.getElementById('btn-prev'),
    btnNext: document.getElementById('btn-next'),
    resultSummary: document.getElementById('result-summary'),
    summaryContent: document.getElementById('summary-content'),
    themeToggle: document.getElementById('theme-toggle')
};

// Initialize the Application
function init() {
    initTheme();
    renderStepper();
    renderStep(state.currentStep);
    attachEventListeners();
}

function initTheme() {
    // Check local storage or system preference
    const savedTheme = localStorage.getItem('theme');

    if (savedTheme) {
        document.documentElement.setAttribute('data-theme', savedTheme);
    } else if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
        document.documentElement.setAttribute('data-theme', 'dark');
    } else {
        document.documentElement.setAttribute('data-theme', 'light');
    }
}

function attachEventListeners() {
    // Theme toggler
    elements.themeToggle.addEventListener('click', () => {
        const currentTheme = document.documentElement.getAttribute('data-theme');
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';

        document.documentElement.setAttribute('data-theme', newTheme);
        localStorage.setItem('theme', newTheme);
    });

    elements.btnNext.addEventListener('click', () => {
        // If on the last step, restart the assistant instead of going forward
        if (state.currentStep === steps.length - 1) {
            state.currentStep = 0;
            state.data = {
                tarifgruppe: null,
                sozialleistung: null,
                beschaeftigungsart: null,
                beschaeftigungsbeginn: null,
                letzter_tag_ef: null,
                berechnungs_variante: null,
                daily_gross_benefit: 0,
                daily_net_benefit: 0,
                unst_bestandteile: null,
                ausgefallene_tage: 0,
                au_beginn_datum: null,
                netto_urlaubsverguetung: 0,
                arbeitszeit_individuell: 0,
                arbeitszeit_vollzeit: 0,
                vl_arbeitgeberanteil: null
            };
            renderStep(state.currentStep);
            updateStepper();
            updateSummary();
            return;
        }

        const currentStepObj = steps[state.currentStep];

        // Validate current step before proceeding
        if (currentStepObj.validate && !currentStepObj.validate()) {
            return;
        }

        if (state.currentStep < steps.length - 1) {
            state.currentStep++;
            renderStep(state.currentStep);
            updateStepper();
            updateSummary();
        }
    });

    elements.btnPrev.addEventListener('click', () => {
        if (state.currentStep > 0) {
            state.currentStep--;
            renderStep(state.currentStep);
            updateStepper();
            updateSummary();
        }
    });

    // Add ENTER key support
    window.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            if (!elements.btnNext.disabled && elements.btnNext.style.display !== 'none') {
                elements.btnNext.click();
            }
        }
    });
}

function renderStep(stepIndex) {
    const step = steps[stepIndex];

    // Clear the container
    elements.questionContainer.innerHTML = '';

    // Create new slide
    const slide = document.createElement('div');
    slide.className = 'question-slide';

    const title = document.createElement('h2');
    title.className = 'question-title';
    title.textContent = step.title;

    const description = document.createElement('p');
    description.className = 'question-description';
    description.textContent = step.description;

    const content = document.createElement('div');
    content.innerHTML = step.content;

    slide.appendChild(title);
    slide.appendChild(description);
    slide.appendChild(content);

    elements.questionContainer.appendChild(slide);

    // Call onRender hook if defined
    if (step.onRender) {
        step.onRender();
    }

    // Auto-focus the first input field
    const firstInput = elements.questionContainer.querySelector('input, select, textarea');
    if (firstInput) {
        firstInput.focus();
    }

    // Update buttons visibility and state
    elements.btnPrev.style.display = 'block';
    elements.btnNext.style.display = 'block';
    elements.btnPrev.disabled = stepIndex === 0;

    if (stepIndex === steps.length - 1) {
        elements.btnNext.textContent = 'Berechnung neu starten';
    } else {
        elements.btnNext.textContent = 'Weiter';
    }
}

function renderStepper() {
    elements.stepper.innerHTML = '';

    steps.forEach((step, index) => {
        const item = document.createElement('div');
        item.className = 'step-item';
        if (index === 0) item.classList.add('active');

        const indicator = document.createElement('div');
        indicator.className = 'step-indicator';
        indicator.textContent = index + 1;

        const content = document.createElement('div');
        content.className = 'step-content';

        const title = document.createElement('h4');
        title.textContent = step.title;

        content.appendChild(title);
        item.appendChild(indicator);
        item.appendChild(content);

        elements.stepper.appendChild(item);
    });
}

function updateStepper() {
    const items = elements.stepper.querySelectorAll('.step-item');

    items.forEach((item, index) => {
        item.classList.remove('active', 'completed');

        if (index === state.currentStep) {
            item.classList.add('active');
        } else if (index < state.currentStep) {
            item.classList.add('completed');
            // Change indicator to checkmark for completed steps
            item.querySelector('.step-indicator').innerHTML = '✓';
        } else {
            // Reset to number for future steps
            item.querySelector('.step-indicator').textContent = index + 1;
        }
    });
}

function updateSummary() {
    if (state.currentStep === 0) {
        elements.resultSummary.style.display = 'none';
        return;
    }

    elements.resultSummary.style.display = 'block';

    let html = '';

    if (state.data.tarifgruppe) {
        html += `
            <div class="summary-row">
                <span class="summary-label">Status:</span>
                <span class="summary-value">${state.data.tarifgruppe === 'regulär' ? 'Regulär' : 'Ineligibel'}</span>
            </div>
        `;
    }

    if (state.data.sozialleistung) {
        html += `
            <div class="summary-row">
                <span class="summary-label">Krankengeld:</span>
                <span class="summary-value">${state.data.sozialleistung === 'ja' ? 'Anspruch' : 'Kein Anspruch'}</span>
            </div>
        `;
    }

    if (state.data.beschaeftigungsbeginn) {
        // Format date nicely
        const dateObj = new Date(state.data.beschaeftigungsbeginn);
        const formattedDate = !isNaN(dateObj.getTime()) ?
            dateObj.toLocaleDateString('de-DE') : state.data.beschaeftigungsbeginn;

        html += `
            <div class="summary-row">
                <span class="summary-label">Beschäftigungsbeginn:</span>
                <span class="summary-value">${formattedDate}</span>
            </div>
        `;
    }

    if (state.data.letzter_tag_ef) {
        const dateObj = new Date(state.data.letzter_tag_ef);
        const formattedDate = !isNaN(dateObj.getTime()) ?
            dateObj.toLocaleDateString('de-DE') : state.data.letzter_tag_ef;

        html += `
            <div class="summary-row">
                <span class="summary-label">Ende EF:</span>
                <span class="summary-value">${formattedDate}</span>
            </div>
        `;

        // Calculate and show employment duration in summary
        const start = new Date(state.data.beschaeftigungsbeginn);
        const efEnde = new Date(state.data.letzter_tag_ef);
        if (!isNaN(start.getTime()) && !isNaN(efEnde.getTime())) {
            let years = efEnde.getFullYear() - start.getFullYear();
            let months = efEnde.getMonth() - start.getMonth();
            if (months < 0 || (months === 0 && efEnde.getDate() < start.getDate())) {
                years--;
                months += 12;
            }
            if (efEnde.getDate() < start.getDate()) {
                months--;
            }

            // Altfall/Neufall status
            let istAltfall = false;
            if (state.data.beschaeftigungsart === 'angestellter') {
                const cutOffDate = new Date('1994-06-01');
                if (start < cutOffDate) istAltfall = true;
            }

            html += `
                <div class="summary-row" style="margin-top: 0.5rem; padding-top: 0.5rem; border-top: 1px dashed var(--border-color);">
                    <span class="summary-label">Einstufung:</span>
                    <span class="summary-value" style="font-weight: 600; color: var(--primary-color);">
                        ${istAltfall ? 'Altfall (§ 71 BAT)' : 'Neufall (§ 22 TV TgDRV)'}
                    </span>
                </div>
                <div class="summary-row">
                    <span class="summary-label">Beschäftigungszeit:</span>
                    <span class="summary-value">${years} J., ${months < 0 ? 0 : months} M.</span>
                </div>
            `;
        }
    }

    if (state.data.berechnungs_variante) {
        html += `
            <div class="summary-row">
                <span class="summary-label">Variante:</span>
                <span class="summary-value">${state.data.berechnungs_variante === 'einzel' ? 'Einzel-Leistung' : 'Mehrfach-Leistung'}</span>
            </div>
        `;
    }

    if (state.data.daily_gross_benefit || state.data.daily_net_benefit) {
        html += `
            <div class="summary-row" style="margin-top: 0.5rem;">
                <span class="summary-label">Ersatzleistung (B/N):</span>
                <span class="summary-value">${(state.data.daily_gross_benefit || 0).toFixed(2)}€ / ${(state.data.daily_net_benefit || 0).toFixed(2)}€</span>
            </div>
        `;
    }

    if (state.data.unst_bestandteile) {
        html += `
            <div class="summary-row">
                <span class="summary-label">Unst. Bestandteile:</span>
                <span class="summary-value">${state.data.unst_bestandteile === 'ja' ? 'Ja' : 'Nein'}</span>
            </div>
        `;
        if (state.data.unst_bestandteile === 'ja' && state.data.au_beginn_datum) {
            html += `
                <div class="summary-row" style="font-size: 0.8rem; padding-left: 0.5rem;">
                    <span>Tage: ${state.data.ausgefallene_tage} | AU: ${new Date(state.data.au_beginn_datum).toLocaleDateString('de-DE')}</span>
                </div>
            `;
        }
    }

    if (state.data.netto_urlaubsverguetung) {
        html += `
            <div class="summary-row">
                <span class="summary-label">Netto-Urlaub:</span>
                <span class="summary-value">${state.data.netto_urlaubsverguetung.toFixed(2)}€</span>
            </div>
        `;
    }

    if (state.data.arbeitszeit_vollzeit) {
        html += `
            <div class="summary-row">
                <span class="summary-label">Arbeitszeit:</span>
                <span class="summary-value">${state.data.arbeitszeit_individuell} / ${state.data.arbeitszeit_vollzeit} h</span>
            </div>
        `;
    }

    if (state.data.vl_arbeitgeberanteil) {
        html += `
            <div class="summary-row">
                <span class="summary-label">VL-Anteil AG:</span>
                <span class="summary-value">${state.data.vl_arbeitgeberanteil === 'ja' ? 'Ja' : 'Nein'}</span>
            </div>
        `;
    }

    if (html === '') {
        html = '<p style="color: var(--text-secondary); font-size: 0.85rem;">Noch keine Daten erfasst.</p>';
    }

    elements.summaryContent.innerHTML = html;
}

function showIneligible(reason) {
    elements.questionContainer.innerHTML = `
        <div class="question-slide">
            <h2 class="question-title">Kein Anspruch</h2>
            <p class="question-description">Auf Basis Ihrer Angaben besteht voraussichtlich kein Anspruch auf Krankengeldzuschuss.</p>
            <div class="info-card" style="border-left-color: var(--error-color); background-color: rgba(239, 68, 68, 0.1);">
                <p>${reason}</p>
            </div>
            <button class="btn btn-primary" style="margin-top: 2rem;" onclick="window.location.reload()">Neu starten</button>
        </div>
    `;
    elements.btnNext.style.display = 'none';
    elements.btnPrev.style.display = 'none';
}

// Start immediately
document.addEventListener('DOMContentLoaded', init);
