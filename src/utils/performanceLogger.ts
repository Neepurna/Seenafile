class PerformanceLogger {
  private static timers: Map<string, number> = new Map();

  static start(operation: string) {
    this.timers.set(operation, Date.now());
    console.log(`🕒 Starting ${operation}`);
  }

  static end(operation: string) {
    const startTime = this.timers.get(operation);
    if (startTime) {
      const duration = Date.now() - startTime;
      console.log(`✅ ${operation} completed in ${duration}ms`);
      this.timers.delete(operation);
    }
  }

  static log(message: string, data?: any) {
    console.log(`📝 ${message}`, data || '');
  }
}

export default PerformanceLogger;
