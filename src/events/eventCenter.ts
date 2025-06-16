// Simple event center for pub/sub pattern
// Import EventEmitter for event handling
import { EventEmitter } from 'events';

// Create a singleton event center instance
const EventCenter = new EventEmitter();

export default EventCenter;