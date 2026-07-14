using AiWorkflow.Application.Common.Models;

namespace AiWorkflow.UnitTests.Application.Common;

public class PagedResultTests
{
    [Fact]
    public void TotalPages_RoundsUp()
    {
        var page = new PagedResult<int>([1, 2, 3], Total: 25, Page: 1, PageSize: 10);

        Assert.Equal(3, page.TotalPages);
    }

    [Fact]
    public void TotalPages_IsAtLeastOne_WhenEmpty()
    {
        var page = new PagedResult<int>([], Total: 0, Page: 1, PageSize: 10);

        Assert.Equal(1, page.TotalPages);
    }

    [Fact]
    public void TotalPages_ExactMultiple()
    {
        var page = new PagedResult<int>([1], Total: 30, Page: 2, PageSize: 15);

        Assert.Equal(2, page.TotalPages);
    }
}
