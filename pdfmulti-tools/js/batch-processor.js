/**
 * Batch Processing Module for PDF Tools
 * 
 * This module provides common functionality for batch processing files
 * in various PDF tools, including:
 * - Memory-efficient processing
 * - Concurrent processing with controlled parallelism
 * - Pause/resume functionality
 * - Progress tracking
 * - Unified error handling
 */

class BatchProcessor {
    constructor(options = {}) {
        this.maxConcurrent = options.maxConcurrent || navigator.hardwareConcurrency || 4;
        this.maxMemory = options.maxMemory || 100 * 1024 * 1024; // 100MB default
        this.callbackDelay = options.callbackDelay || 50; // ms between callbacks
        
        this.totalJobs = 0;
        this.completedJobs = 0;
        this.failedJobs = 0;
        this.activeJobs = 0;
        this.queue = [];
        this.results = [];
        this.errors = [];
        this.paused = false;
        this.cancelled = false;
        this.memoryUsage = 0;
        
        // Callbacks
        this.onProgress = options.onProgress || (() => {});
        this.onComplete = options.onComplete || (() => {});
        this.onError = options.onError || (() => {});
        this.onJobStart = options.onJobStart || (() => {});
        this.onJobComplete = options.onJobComplete || (() => {});
        this.onJobError = options.onJobError || (() => {});
        
        // Bind methods
        this.processQueue = this.processQueue.bind(this);
        this.addJob = this.addJob.bind(this);
        this.pause = this.pause.bind(this);
        this.resume = this.resume.bind(this);
        this.cancel = this.cancel.bind(this);
        this.getStatus = this.getStatus.bind(this);
        this.getResults = this.getResults.bind(this);
        this.getErrors = this.getErrors.bind(this);
        
        // Memory monitor
        this.memoryMonitorId = setInterval(() => {
            if (window.performance && performance.memory) {
                this.memoryUsage = performance.memory.usedJSHeapSize;
            }
        }, 1000);
    }
    
    /**
     * Add a job to the processing queue
     * @param {Object} job - Job configuration with task, data, and metadata
     * @param {Function} job.task - The async function to execute for this job
     * @param {*} job.data - The data to pass to the task function
     * @param {Object} job.metadata - Additional metadata about the job
     */
    addJob(job) {
        if (!job.task || typeof job.task !== 'function') {
            throw new Error('Job must have a task function');
        }
        
        this.queue.push(job);
        this.totalJobs++;
        
        // Start processing if not already running
        if (this.activeJobs < this.maxConcurrent && !this.paused) {
            this.processQueue();
        }
        
        return this.totalJobs - 1; // Return job index
    }
    
    /**
     * Add multiple jobs at once
     * @param {Array} jobs - Array of job configurations
     */
    addJobs(jobs) {
        if (!Array.isArray(jobs)) {
            throw new Error('Jobs must be an array');
        }
        
        const jobIndexes = [];
        for (const job of jobs) {
            jobIndexes.push(this.addJob(job));
        }
        
        return jobIndexes;
    }
    
    /**
     * Process the next job in the queue
     */
    async processQueue() {
        // Check if we should process more jobs
        if (this.paused || this.cancelled || this.queue.length === 0 || this.activeJobs >= this.maxConcurrent) {
            return;
        }
        
        // Check memory usage before starting new job
        if (this.memoryUsage > this.maxMemory) {
            // Wait for memory to free up
            setTimeout(() => this.processQueue(), 500);
            return;
        }
        
        // Get the next job
        const job = this.queue.shift();
        this.activeJobs++;
        
        try {
            // Call the job start callback
            this.onJobStart(job.metadata);
            
            // Execute the job
            const result = await job.task(job.data);
            
            // Record the result
            this.results.push({
                result,
                metadata: job.metadata
            });
            
            // Update counters
            this.completedJobs++;
            this.activeJobs--;
            
            // Call job complete callback
            this.onJobComplete(result, job.metadata);
            
            // Update progress
            this.updateProgress();
            
        } catch (error) {
            // Record the error
            this.errors.push({
                error,
                metadata: job.metadata
            });
            
            // Update counters
            this.failedJobs++;
            this.activeJobs--;
            
            // Call job error callback
            this.onJobError(error, job.metadata);
            
            // Update progress
            this.updateProgress();
        }
        
        // Check if we're done
        if (this.completedJobs + this.failedJobs === this.totalJobs) {
            this.onComplete(this.results);
            clearInterval(this.memoryMonitorId);
        } else {
            // Process more jobs
            setTimeout(() => this.processQueue(), this.callbackDelay);
            
            // Start processing more jobs if possible
            if (this.activeJobs < this.maxConcurrent && !this.paused && !this.cancelled) {
                this.processQueue();
            }
        }
    }
    
    /**
     * Update the progress and call the progress callback
     */
    updateProgress() {
        const progress = {
            total: this.totalJobs,
            completed: this.completedJobs,
            failed: this.failedJobs,
            active: this.activeJobs,
            queued: this.queue.length,
            percent: Math.round((this.completedJobs + this.failedJobs) / this.totalJobs * 100),
            memoryUsage: this.memoryUsage
        };
        
        this.onProgress(progress);
    }
    
    /**
     * Pause the processing
     */
    pause() {
        this.paused = true;
        return this.getStatus();
    }
    
    /**
     * Resume the processing
     */
    resume() {
        this.paused = false;
        
        // Restart processing if needed
        if (this.activeJobs < this.maxConcurrent) {
            this.processQueue();
        }
        
        return this.getStatus();
    }
    
    /**
     * Cancel all processing
     */
    cancel() {
        this.cancelled = true;
        this.queue = [];
        return this.getStatus();
    }
    
    /**
     * Get the current status of the batch processor
     */
    getStatus() {
        return {
            total: this.totalJobs,
            completed: this.completedJobs,
            failed: this.failedJobs,
            active: this.activeJobs,
            queued: this.queue.length,
            paused: this.paused,
            cancelled: this.cancelled,
            percent: Math.round((this.completedJobs + this.failedJobs) / this.totalJobs * 100) || 0,
            memoryUsage: this.memoryUsage
        };
    }
    
    /**
     * Get all results
     */
    getResults() {
        return this.results;
    }
    
    /**
     * Get all errors
     */
    getErrors() {
        return this.errors;
    }
}

// Export the BatchProcessor class
if (typeof module !== 'undefined') {
    module.exports = { BatchProcessor };
} else {
    window.BatchProcessor = BatchProcessor;
} 