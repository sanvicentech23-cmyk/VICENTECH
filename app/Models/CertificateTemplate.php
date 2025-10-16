<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class CertificateTemplate extends Model
{
    use HasFactory;

    protected $fillable = [
        'name',
        'certificate_type',
        'description',
        'template_data',
        'default_data',
        'is_active',
        'is_default'
    ];

    protected $casts = [
        'template_data' => 'array',
        'default_data' => 'array',
        'is_active' => 'boolean',
        'is_default' => 'boolean'
    ];

    // Relationships
    public function certificateReleases()
    {
        return $this->hasMany(CertificateRelease::class);
    }

    // Scopes
    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }

    public function scopeByType($query, $type)
    {
        return $query->where('certificate_type', $type);
    }

    public function scopeDefault($query)
    {
        return $query->where('is_default', true);
    }

    // Methods
    public static function getDefaultTemplateForType($type)
    {
        return static::where('certificate_type', $type)
                   ->where('is_default', true)
                   ->where('is_active', true)
                   ->first();
    }

    public static function createDefaultTemplate($type)
    {
        $defaultTemplate = [
            'baptism' => [
                'elements' => [
                    [
                        'id' => 'title',
                        'type' => 'text',
                        'content' => 'BAPTISMAL CERTIFICATE',
                        'position' => ['x' => 50, 'y' => 50],
                        'style' => [
                            'fontSize' => 24,
                            'fontWeight' => 'bold',
                            'textAlign' => 'center',
                            'color' => '#000000'
                        ]
                    ],
                    [
                        'id' => 'name',
                        'type' => 'text',
                        'content' => '{{recipient_name}}',
                        'position' => ['x' => 50, 'y' => 120],
                        'style' => [
                            'fontSize' => 18,
                            'fontWeight' => 'bold',
                            'textAlign' => 'center',
                            'color' => '#000000'
                        ]
                    ],
                    [
                        'id' => 'date',
                        'type' => 'text',
                        'content' => 'Date: {{certificate_date}}',
                        'position' => ['x' => 50, 'y' => 180],
                        'style' => [
                            'fontSize' => 14,
                            'textAlign' => 'center',
                            'color' => '#000000'
                        ]
                    ],
                    [
                        'id' => 'priest_signature',
                        'type' => 'signature',
                        'content' => '{{priest_signature}}',
                        'position' => ['x' => 50, 'y' => 250],
                        'style' => [
                            'width' => 200,
                            'height' => 80
                        ]
                    ],
                    [
                        'id' => 'reference',
                        'type' => 'text',
                        'content' => 'Reference: {{unique_reference}}',
                        'position' => ['x' => 50, 'y' => 350],
                        'style' => [
                            'fontSize' => 12,
                            'textAlign' => 'center',
                            'color' => '#666666'
                        ]
                    ]
                ],
                'background' => '#ffffff',
                'dimensions' => ['width' => 800, 'height' => 600]
            ],
            'confirmation' => [
                'elements' => [
                    [
                        'id' => 'title',
                        'type' => 'text',
                        'content' => 'CONFIRMATION CERTIFICATE',
                        'position' => ['x' => 50, 'y' => 50],
                        'style' => [
                            'fontSize' => 24,
                            'fontWeight' => 'bold',
                            'textAlign' => 'center',
                            'color' => '#000000'
                        ]
                    ],
                    [
                        'id' => 'name',
                        'type' => 'text',
                        'content' => '{{recipient_name}}',
                        'position' => ['x' => 50, 'y' => 120],
                        'style' => [
                            'fontSize' => 18,
                            'fontWeight' => 'bold',
                            'textAlign' => 'center',
                            'color' => '#000000'
                        ]
                    ],
                    [
                        'id' => 'date',
                        'type' => 'text',
                        'content' => 'Date: {{certificate_date}}',
                        'position' => ['x' => 50, 'y' => 180],
                        'style' => [
                            'fontSize' => 14,
                            'textAlign' => 'center',
                            'color' => '#000000'
                        ]
                    ],
                    [
                        'id' => 'priest_signature',
                        'type' => 'signature',
                        'content' => '{{priest_signature}}',
                        'position' => ['x' => 50, 'y' => 250],
                        'style' => [
                            'width' => 200,
                            'height' => 80
                        ]
                    ],
                    [
                        'id' => 'reference',
                        'type' => 'text',
                        'content' => 'Reference: {{unique_reference}}',
                        'position' => ['x' => 50, 'y' => 350],
                        'style' => [
                            'fontSize' => 12,
                            'textAlign' => 'center',
                            'color' => '#666666'
                        ]
                    ]
                ],
                'background' => '#ffffff',
                'dimensions' => ['width' => 800, 'height' => 600]
            ],
            'marriage' => [
                'elements' => [
                    [
                        'id' => 'title',
                        'type' => 'text',
                        'content' => 'MARRIAGE CERTIFICATE',
                        'position' => ['x' => 50, 'y' => 50],
                        'style' => [
                            'fontSize' => 24,
                            'fontWeight' => 'bold',
                            'textAlign' => 'center',
                            'color' => '#000000'
                        ]
                    ],
                    [
                        'id' => 'name',
                        'type' => 'text',
                        'content' => '{{recipient_name}}',
                        'position' => ['x' => 50, 'y' => 120],
                        'style' => [
                            'fontSize' => 18,
                            'fontWeight' => 'bold',
                            'textAlign' => 'center',
                            'color' => '#000000'
                        ]
                    ],
                    [
                        'id' => 'date',
                        'type' => 'text',
                        'content' => 'Date: {{certificate_date}}',
                        'position' => ['x' => 50, 'y' => 180],
                        'style' => [
                            'fontSize' => 14,
                            'textAlign' => 'center',
                            'color' => '#000000'
                        ]
                    ],
                    [
                        'id' => 'priest_signature',
                        'type' => 'signature',
                        'content' => '{{priest_signature}}',
                        'position' => ['x' => 50, 'y' => 250],
                        'style' => [
                            'width' => 200,
                            'height' => 80
                        ]
                    ],
                    [
                        'id' => 'reference',
                        'type' => 'text',
                        'content' => 'Reference: {{unique_reference}}',
                        'position' => ['x' => 50, 'y' => 350],
                        'style' => [
                            'fontSize' => 12,
                            'textAlign' => 'center',
                            'color' => '#666666'
                        ]
                    ]
                ],
                'background' => '#ffffff',
                'dimensions' => ['width' => 800, 'height' => 600]
            ]
        ];

        $templateData = $defaultTemplate[$type] ?? $defaultTemplate['baptism'];
        
        return static::create([
            'name' => ucfirst($type) . ' Certificate Template',
            'certificate_type' => $type,
            'description' => 'Default template for ' . $type . ' certificates',
            'template_data' => $templateData,
            'default_data' => [],
            'is_active' => true,
            'is_default' => true
        ]);
    }
}
