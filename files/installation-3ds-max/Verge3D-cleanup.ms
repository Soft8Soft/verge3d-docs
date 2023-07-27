for def in custAttributes.getSceneDefs() do (
    local instances = custAttributes.getDefInstances def;
    local defName = def.name as string;
    if (findString defName "V3D" != undefined) then (  
        for i in instances do (
            local owner = custAttributes.getOwner i;
            if (owner != undefined) then (
                format "Removing % from \"%\"\n" defName owner;
                custAttributes.delete owner def;
            )
        )
    )
)
