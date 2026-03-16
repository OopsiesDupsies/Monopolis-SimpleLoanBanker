import Modal from './Modal';

export function PropertyTradingModals({
    modal,
    setModal,
    selectedProperty,
    tradeTargetId,
    setTradeTargetId,
    tradeCash,
    setTradeCash,
    listingPrice,
    setListingPrice,
    auctionDuration,
    setAuctionDuration,
    closeModal,
    send,
    me,
    state
}: any) {
    return (
        <>
            {/* TRADE PROPERTY */}
            {selectedProperty && (
                <Modal isOpen={modal === 'trade_property'} onClose={closeModal} title={`Trade ${selectedProperty.name}`}
                    actions={<button className="btn btn-primary" onClick={() => {
                        if (tradeTargetId) {
                            send('create_trade_offer', {
                                from_player_id: me.id,
                                to_player_id: tradeTargetId,
                                offer_properties: [selectedProperty.id],
                                offer_cash: Number(tradeCash) || 0,
                                offer_shares: 0,
                                offer_loans: [],
                                request_properties: [],
                                request_cash: 0,
                                request_shares: 0,
                                request_loans: []
                            });
                            closeModal();
                        }
                    }} disabled={!tradeTargetId}>Send Offer</button>}>
                    <div className="input-group">
                        <label>Trade To</label>
                        <select value={tradeTargetId} onChange={e => setTradeTargetId(e.target.value)}>
                            <option value="">Select Player...</option>
                            {state.players.filter((p: any) => p.id !== me.id).map((p: any) => (
                                <option key={p.id} value={p.id}>{p.name}</option>
                            ))}
                        </select>
                    </div>
                    <div className="input-group">
                        <label>Add Cash (Optional)</label>
                        <input type="number" value={tradeCash} onChange={e => setTradeCash(e.target.value)} placeholder="0" />
                    </div>
                </Modal>
            )}

            {/* SELL OPTIONS */}
            {selectedProperty && (
                <Modal isOpen={modal === 'sell_options'} onClose={closeModal} title={`Sell ${selectedProperty.name}`}>
                    <div style={{ display: 'grid', gap: 12 }}>
                        <div style={{ fontSize: 12, padding: 10, background: 'rgba(0,0,0,0.2)', borderRadius: 8, marginBottom: 4 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                                <span style={{ opacity: 0.7 }}>Trade Price:</span>
                                <span style={{ fontWeight: 600 }}>${selectedProperty.price.toLocaleString()}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <span style={{ opacity: 0.7 }}>Bank Appraisal:</span>
                                <span style={{ fontWeight: 600 }}>${(selectedProperty.bankAppraisal || selectedProperty.price).toLocaleString()}</span>
                            </div>
                        </div>
                        <button
                            className="btn btn-danger"
                            onClick={() => {
                                send('sell_property_to_bank', { player_id: me.id, property_id: selectedProperty.id });
                                closeModal();
                            }}
                        >
                            Sell to Bank (${Math.floor((selectedProperty.bankAppraisal || selectedProperty.price) * 50 / 100)})
                        </button>
                        <button
                            className="btn btn-success"
                            onClick={() => {
                                setListingPrice(String(selectedProperty.price));
                                setModal('list_property');
                            }}
                        >
                            List for Sale
                        </button>
                    </div>
                </Modal>
            )}

            {/* LIST PROPERTY */}
            {selectedProperty && (
                <Modal isOpen={modal === 'list_property'} onClose={closeModal} title={`List ${selectedProperty.name}`}
                    actions={<button className="btn btn-success" onClick={() => {
                        send('list_property', {
                            player_id: me.id,
                            property_id: selectedProperty.id,
                            price: Number(listingPrice)
                        });
                        closeModal();
                    }} disabled={!listingPrice || Number(listingPrice) <= 0}>List Property</button>}>
                    <div className="input-group">
                        <label>Listing Price</label>
                        <input type="number" value={listingPrice} onChange={e => setListingPrice(e.target.value)} placeholder="Enter price..." />
                    </div>
                    <div style={{ fontSize: 11, opacity: 0.7, marginTop: 8, padding: 8, background: 'rgba(0,0,0,0.2)', borderRadius: 6 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                            <span>Trade Price:</span>
                            <span>${selectedProperty.price.toLocaleString()}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span>Bank Appraisal:</span>
                            <span>${(selectedProperty.bankAppraisal || selectedProperty.price).toLocaleString()}</span>
                        </div>
                    </div>
                </Modal>
            )}

            {/* AUCTION PROPERTY */}
            {selectedProperty && (
                <Modal isOpen={modal === 'auction_property'} onClose={closeModal} title={`Auction ${selectedProperty.name}`}
                    actions={<button className="btn btn-success" onClick={() => {
                        send('create_auction', {
                            player_id: me.id,
                            property_id: selectedProperty.id,
                            starting_bid: Number(listingPrice),
                            duration_minutes: Number(auctionDuration)
                        });
                        closeModal();
                    }} disabled={!listingPrice || Number(listingPrice) <= 0}>Start Auction</button>}>
                    <div className="input-group">
                        <label>Starting Bid</label>
                        <input type="number" value={listingPrice} onChange={e => setListingPrice(e.target.value)} placeholder="Enter starting bid..." />
                    </div>
                    <div className="input-group">
                        <label>Duration (minutes)</label>
                        <select value={auctionDuration} onChange={e => setAuctionDuration(e.target.value)}>
                            <option value="5">5 minutes</option>
                            <option value="10">10 minutes</option>
                            <option value="15">15 minutes</option>
                            <option value="30">30 minutes</option>
                        </select>
                    </div>
                    <div style={{ fontSize: 11, opacity: 0.7, marginTop: 8, padding: 8, background: 'rgba(0,0,0,0.2)', borderRadius: 6 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                            <span>Trade Price:</span>
                            <span>${selectedProperty.price.toLocaleString()}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span>Bank Appraisal:</span>
                            <span>${(selectedProperty.bankAppraisal || selectedProperty.price).toLocaleString()}</span>
                        </div>
                    </div>
                </Modal>
            )}
        </>
    );
}
