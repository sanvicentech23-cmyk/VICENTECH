<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Services\MembershipStatusService;

class UpdateMembershipStatus extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'membership:update-status {--user= : Update specific user by ID}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Automatically update membership statuses based on user activity';

    protected $membershipService;

    public function __construct(MembershipStatusService $membershipService)
    {
        parent::__construct();
        $this->membershipService = $membershipService;
    }

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $this->info('Starting automatic membership status update...');
        
        if ($userId = $this->option('user')) {
            // Update specific user
            $user = \App\Models\User::find($userId);
            if (!$user) {
                $this->error("User with ID {$userId} not found.");
                return 1;
            }
            
            $updated = $this->membershipService->updateUserStatus($user);
            if ($updated) {
                $this->info("Updated user {$user->name} (ID: {$user->id})");
            } else {
                $this->info("No status change needed for user {$user->name} (ID: {$user->id})");
            }
        } else {
            // Update all users
            $updatedCount = $this->membershipService->updateMembershipStatuses();
            $this->info("Updated {$updatedCount} users' membership statuses.");
        }
        
        // Show statistics
        $stats = $this->membershipService->getMembershipStatistics();
        $this->table(
            ['Status', 'Count'],
            [
                ['Total', $stats['total']],
                ['Active', $stats['active']],
                ['Inactive', $stats['inactive']],
                ['Visitor', $stats['visitor']],
                ['New Member', $stats['new_member']],
            ]
        );
        
        $this->info('Membership status update completed successfully!');
        return 0;
    }
}
